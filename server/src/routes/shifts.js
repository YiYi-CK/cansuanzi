const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);

/** 查排班 (按日期范围) */
router.get('/', async (req, res) => {
  const { date_from, date_to } = req.query;
  const query = db('shifts').where({ restaurant_id: req.restaurantId });
  if (date_from) query.where('date', '>=', date_from);
  if (date_to) query.where('date', '<=', date_to);
  const shifts = await query.orderBy('date').orderBy('start_time');
  res.json(shifts);
});

/** 新增班次 */
router.post('/', role('owner', 'manager'), async (req, res) => {
  const { employee_id, date, start_time, end_time, break_minutes, area } = req.body;
  const [id] = await db('shifts').insert({
    restaurant_id: req.restaurantId, employee_id: employee_id || null,
    date, start_time, end_time,
    break_minutes: break_minutes || 0, area: area || '',
  });
  res.status(201).json({ id });
});

/** 编辑班次 */
router.put('/:id', role('owner', 'manager'), async (req, res) => {
  const { employee_id, start_time, end_time, break_minutes, area } = req.body;
  const updates = {};
  if (employee_id !== undefined) updates.employee_id = employee_id;
  if (start_time) updates.start_time = start_time;
  if (end_time) updates.end_time = end_time;
  if (break_minutes !== undefined) updates.break_minutes = break_minutes;
  if (area !== undefined) updates.area = area;
  updates.updated_at = db.fn.now();

  await db('shifts').where({ id: req.params.id, restaurant_id: req.restaurantId }).update(updates);
  res.json({ ok: true });
});

/** 删除班次 */
router.delete('/:id', role('owner', 'manager'), async (req, res) => {
  await db('shifts').where({ id: req.params.id, restaurant_id: req.restaurantId }).del();
  res.json({ ok: true });
});

/** 从模板批量排班 */
router.post('/apply-template', role('owner', 'manager'), async (req, res) => {
  const { templateId, weekStart } = req.body;
  const template = await db('shift_templates').where({ id: templateId }).where(function () {
    this.where({ restaurant_id: req.restaurantId }).orWhere({ is_system: true });
  }).first();
  if (!template) return res.status(404).json({ error: '模板不存在' });

  const inserted = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    if (template.day_of_week !== null && template.day_of_week !== date.getDay()) continue;

    const [id] = await db('shifts').insert({
      restaurant_id: req.restaurantId,
      employee_id: null, // open shift
      date: dateStr,
      start_time: template.start_time,
      end_time: template.end_time,
      break_minutes: template.break_minutes,
      area: template.area,
    });
    inserted.push(id);
  }
  res.status(201).json({ created: inserted.length });
});

/** 排班模板 CRUD */
router.get('/templates', async (req, res) => {
  const templates = await db('shift_templates')
    .where({ restaurant_id: req.restaurantId })
    .orWhere({ is_system: true })
    .orderBy('is_system', 'desc')
    .orderBy('name');
  res.json(templates);
});

router.post('/templates', role('owner', 'manager'), async (req, res) => {
  const { name, day_of_week, start_time, end_time, break_minutes, area } = req.body;
  const [id] = await db('shift_templates').insert({
    restaurant_id: req.restaurantId, name, day_of_week: day_of_week ?? null,
    start_time, end_time, break_minutes: break_minutes || 0, area, is_system: false,
  });
  res.status(201).json({ id });
});

router.put('/templates/:id', role('owner', 'manager'), async (req, res) => {
  const t = await db('shift_templates').where({ id: req.params.id, restaurant_id: req.restaurantId, is_system: false }).first();
  if (!t) return res.status(404).json({ error: '未找到模板或不可修改系统模板' });
  const { name, day_of_week, start_time, end_time, break_minutes, area } = req.body;
  await db('shift_templates').where({ id: req.params.id }).update({ name, day_of_week, start_time, end_time, break_minutes, area });
  res.json({ ok: true });
});

router.delete('/templates/:id', role('owner', 'manager'), async (req, res) => {
  const t = await db('shift_templates').where({ id: req.params.id, restaurant_id: req.restaurantId, is_system: false }).first();
  if (!t) return res.status(404).json({ error: '未找到模板或不可删除系统模板' });
  await db('shift_templates').where({ id: req.params.id }).del();
  res.json({ ok: true });
});

module.exports = router;
