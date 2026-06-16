const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);

/** 员工列表 */
router.get('/', role('owner', 'manager'), async (req, res) => {
  const rows = await db('employees')
    .where({ restaurant_id: req.restaurantId })
    .select('id', 'name', 'email', 'phone', 'role', 'employment_type', 'base_hourly_rate', 'active');
  res.json(rows);
});

/** 新增员工 */
router.post('/', role('owner', 'manager'), async (req, res) => {
  try {
    const { name, email, password, phone, employment_type, base_hourly_rate, ...loadings } = req.body;
    if (!name) return res.status(400).json({ error: '姓名为必填' });

    let password_hash = null;
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }

    const [id] = await db('employees').insert({
      restaurant_id: req.restaurantId,
      name, email: email || `${name.toLowerCase().replace(/\s/g, '')}@temp.com`,
      password_hash: password_hash || await bcrypt.hash('temp123', 10),
      phone,
      employment_type: employment_type || 'casual',
      base_hourly_rate: base_hourly_rate || 0,
      saturday_loading: loadings.saturday_loading || 1.25,
      sunday_loading: loadings.sunday_loading || 1.50,
      public_holiday_loading: loadings.public_holiday_loading || 2.50,
      late_night_loading: loadings.late_night_loading || 1.50,
      casual_loading: loadings.casual_loading || 0.25,
      role: 'employee',
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '新增员工失败' });
  }
});

/** 员工详情 */
router.get('/:id', role('owner', 'manager'), async (req, res) => {
  const emp = await db('employees').where({ id: req.params.id, restaurant_id: req.restaurantId }).first();
  if (!emp) return res.status(404).json({ error: '员工不存在' });
  const { password_hash, ...safe } = emp;
  res.json(safe);
});

/** 更新员工 */
router.put('/:id', role('owner', 'manager'), async (req, res) => {
  const { name, email, phone, employment_type, base_hourly_rate, active, ...loadings } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (employment_type !== undefined) updates.employment_type = employment_type;
  if (base_hourly_rate !== undefined) updates.base_hourly_rate = base_hourly_rate;
  if (active !== undefined) updates.active = active;
  for (const k of ['saturday_loading', 'sunday_loading', 'public_holiday_loading', 'late_night_loading', 'casual_loading']) {
    if (loadings[k] !== undefined) updates[k] = loadings[k];
  }
  updates.updated_at = db.fn.now();

  await db('employees').where({ id: req.params.id, restaurant_id: req.restaurantId }).update(updates);
  res.json({ ok: true });
});

/** 禁用员工 (软删除) */
router.delete('/:id', role('owner', 'manager'), async (req, res) => {
  await db('employees').where({ id: req.params.id, restaurant_id: req.restaurantId }).update({ active: false, updated_at: db.fn.now() });
  res.json({ ok: true });
});

/** 员工可用时间 */
router.get('/:id/availabilities', role('owner', 'manager', 'employee'), async (req, res) => {
  const rows = await db('employee_availabilities').where({ employee_id: req.params.id });
  res.json(rows);
});

router.post('/:id/availabilities', role('owner', 'manager', 'employee'), async (req, res) => {
  // 先删旧的再插新的（批量替换模式）
  await db('employee_availabilities').where({ employee_id: req.params.id }).del();
  const items = req.body.availabilities || [];
  if (items.length > 0) {
    await db('employee_availabilities').insert(
      items.map(a => ({ employee_id: parseInt(req.params.id), day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time }))
    );
  }
  res.json({ ok: true });
});

module.exports = router;
