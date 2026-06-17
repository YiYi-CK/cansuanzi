const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);

/** 查排班 (按日期范围) */
router.get('/', async (req, res) => {
  const { date_from, date_to } = req.query;
  const query = db('shifts')
    .leftJoin('shift_swaps', function() { this.on('shifts.id', 'shift_swaps.shift_id').andOn('shift_swaps.status', db.raw('?', ['approved'])); })
    .where({ 'shifts.restaurant_id': req.restaurantId })
    .select('shifts.*', 'shift_swaps.id as swap_id', 'shift_swaps.requester_id as swap_from');
  if (date_from) query.where('shifts.date', '>=', date_from);
  if (date_to) query.where('shifts.date', '<=', date_to);
  const shifts = await query.orderBy('shifts.date').orderBy('shifts.start_time');
  
  // 查该日期范围内已批准的请假
  const leaves = await db('leave_requests')
    .whereIn('status', ['approved'])
    .where(function() { this.where('start_date', '<=', date_to).andWhere('end_date', '>=', date_from); })
    .select('employee_id', 'start_date', 'end_date');

  // 给每个排班标注是否在请假中
  for (const s of shifts) {
    s.on_leave = leaves.some(l => l.employee_id === s.employee_id && s.date >= l.start_date && s.date <= l.end_date);
  }

  res.json(shifts);
});

/** 新增班次 */
router.post('/', role('owner', 'manager'), async (req, res) => {
  const { employee_id, date, start_time, end_time, break_minutes, area } = req.body;

  // 检查重复：同时段同员工只能有一个排班
  if (employee_id) {
    const conflict = await db('shifts')
      .where({ restaurant_id: req.restaurantId, employee_id, date })
      .where('start_time', '<', end_time)
      .where('end_time', '>', start_time)
      .whereIn('status', ['scheduled', 'completed'])
      .first();
    if (conflict) return res.status(409).json({ error: '该员工在此时段已有排班' });
  }

  const [id] = await db('shifts').insert({
    restaurant_id: req.restaurantId, employee_id: employee_id || null,
    date, start_time, end_time,
    break_minutes: break_minutes || 0, area: area || '',
  });
  res.status(201).json({ id });
});

/** 编辑班次 */
router.put('/:id', role('owner', 'manager'), async (req, res) => {
  const { employee_id, start_time, end_time, break_minutes, area, date } = req.body;
  const updates = {};
  if (employee_id !== undefined) updates.employee_id = employee_id;
  if (start_time) updates.start_time = start_time;
  if (end_time) updates.end_time = end_time;
  if (break_minutes !== undefined) updates.break_minutes = break_minutes;
  if (area !== undefined) updates.area = area;
  updates.updated_at = db.fn.now();

  // 检查冲突（排除自身）
  if (employee_id !== undefined && start_time && end_time && date) {
    const conflict = await db('shifts')
      .where({ restaurant_id: req.restaurantId, employee_id, date })
      .where('id', '!=', req.params.id)
      .where('start_time', '<', end_time)
      .where('end_time', '>', start_time)
      .whereIn('status', ['scheduled', 'completed'])
      .first();
    if (conflict) return res.status(409).json({ error: '该员工在此时段已有排班' });
  }

  await db('shifts').where({ id: req.params.id, restaurant_id: req.restaurantId }).update(updates);
  res.json({ ok: true });
});

/** 删除班次 */
router.delete('/:id', role('owner', 'manager'), async (req, res) => {
  await db('shifts').where({ id: req.params.id, restaurant_id: req.restaurantId }).del();
  res.json({ ok: true });
});

module.exports = router;
