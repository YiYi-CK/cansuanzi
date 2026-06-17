const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);

/** 换班列表 */
router.get('/swaps', role('owner', 'manager'), async (req, res) => {
  const swaps = await db('shift_swaps')
    .join('shifts', 'shift_swaps.shift_id', 'shifts.id')
    .join('employees as requester', 'shift_swaps.requester_id', 'requester.id')
    .leftJoin('employees as target', 'shift_swaps.target_employee_id', 'target.id')
    .leftJoin('employees as approver', 'shift_swaps.approver_id', 'approver.id')
    .where('shifts.restaurant_id', req.restaurantId)
    .select('shift_swaps.*', 'shifts.date', 'shifts.start_time', 'shifts.end_time', 'shifts.area',
      'requester.name as requester_name', 'target.name as target_name', 'approver.name as approver_name')
    .orderBy('shift_swaps.created_at', 'desc');
  res.json(swaps);
});

/** 发起换班 */
router.post('/swaps', role('owner', 'manager', 'employee'), async (req, res) => {
  const { shift_id, target_employee_id, reason } = req.body;
  const shift = await db('shifts').where({ id: shift_id }).first();
  if (!shift) return res.status(404).json({ error: '班次不存在' });

  const [id] = await db('shift_swaps').insert({
    shift_id, requester_id: req.user.id,
    target_employee_id: target_employee_id || null, reason,
  });
  res.status(201).json({ id });
});

/** 审批换班 */
router.put('/swaps/:id/approve', role('owner', 'manager'), async (req, res) => {
  const swap = await db('shift_swaps').where({ id: req.params.id }).first();
  if (!swap) return res.status(404).json({ error: '申请不存在' });

  await db('shift_swaps').where({ id: req.params.id }).update({ status: 'approved', approver_id: req.user.id, updated_at: db.fn.now() });
  if (swap.target_employee_id) {
    await db('shifts').where({ id: swap.shift_id }).update({ employee_id: swap.target_employee_id, status: 'swapped', updated_at: db.fn.now() });
  }
  res.json({ ok: true });
});

router.put('/swaps/:id/undo', role('owner', 'manager'), async (req, res) => {
  const swap = await db('shift_swaps').where({ id: req.params.id }).first();
  if (!swap) return res.status(404).json({ error: '换班申请不存在' });
  if (swap.status === 'pending') return res.status(400).json({ error: '待审批的申请无需撤回' });

  if (swap.status === 'approved') {
    await db('shifts').where({ id: swap.shift_id }).update({ employee_id: swap.requester_id, status: 'scheduled', updated_at: db.fn.now() });
  }
  await db('shift_swaps').where({ id: req.params.id }).update({ status: 'pending', approver_id: req.user.id, updated_at: db.fn.now() });
  res.json({ ok: true });
});

router.put('/swaps/:id/reject', role('owner', 'manager'), async (req, res) => {
  await db('shift_swaps').where({ id: req.params.id }).update({ status: 'rejected', approver_id: req.user.id, updated_at: db.fn.now() });
  res.json({ ok: true });
});

/** 编辑换班记录 */
router.put('/swaps/:id', role('owner', 'manager'), async (req, res) => {
  const { status, reason } = req.body;
  const update = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) update.status = status;
  if (reason !== undefined) update.reason = reason;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: '缺少更新字段' });
  update.updated_at = db.fn.now();
  const updated = await db('shift_swaps').where({ id: req.params.id }).update(update);
  if (!updated) return res.status(404).json({ error: '记录不存在' });
  res.json({ ok: true });
});

/** 请假列表 */
router.get('/leaves', role('owner', 'manager'), async (req, res) => {
  const leaves = await db('leave_requests')
    .join('employees', 'leave_requests.employee_id', 'employees.id')
    .leftJoin('employees as approver', 'leave_requests.approver_id', 'approver.id')
    .where('employees.restaurant_id', req.restaurantId)
    .select('leave_requests.*', 'employees.name as employee_name', 'approver.name as approver_name')
    .orderBy('leave_requests.created_at', 'desc');
  res.json(leaves);
});

/** 发起请假 */
router.post('/leaves', role('owner', 'manager', 'employee'), async (req, res) => {
  const { start_date, end_date, reason, type } = req.body;
  const [id] = await db('leave_requests').insert({
    employee_id: req.user.id, start_date, end_date, reason, type: type || 'unpaid',
  });
  res.status(201).json({ id });
});

/** 审批请假 */
router.put('/leaves/:id/approve', role('owner', 'manager'), async (req, res) => {
  await db('leave_requests').where({ id: req.params.id }).update({ status: 'approved', approver_id: req.user.id, updated_at: db.fn.now() });
  res.json({ ok: true });
});

router.put('/leaves/:id/reject', role('owner', 'manager'), async (req, res) => {
  await db('leave_requests').where({ id: req.params.id }).update({ status: 'rejected', approver_id: req.user.id, updated_at: db.fn.now() });
  res.json({ ok: true });
});

router.put('/leaves/:id/undo', role('owner', 'manager'), async (req, res) => {
  await db('leave_requests').where({ id: req.params.id }).update({ status: 'pending', approver_id: null, updated_at: db.fn.now() });
  res.json({ ok: true });
});

/** 编辑请假记录 */
router.put('/leaves/:id', role('owner', 'manager'), async (req, res) => {
  const { status, reason, start_date, end_date, type } = req.body;
  const update = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status)) update.status = status;
  if (reason !== undefined) update.reason = reason;
  if (start_date) update.start_date = start_date;
  if (end_date) update.end_date = end_date;
  if (type) update.type = type;
  if (Object.keys(update).length === 0) return res.status(400).json({ error: '缺少更新字段' });
  update.updated_at = db.fn.now();
  const updated = await db('leave_requests').where({ id: req.params.id }).update(update);
  if (!updated) return res.status(404).json({ error: '记录不存在' });
  res.json({ ok: true });
});

/** 合并审批记录列表 */
router.get('/all', role('owner', 'manager'), async (req, res) => {
  const [swaps, leaves] = await Promise.all([
    db('shift_swaps')
      .join('shifts', 'shift_swaps.shift_id', 'shifts.id')
      .join('employees as requester', 'shift_swaps.requester_id', 'requester.id')
      .leftJoin('employees as target', 'shift_swaps.target_employee_id', 'target.id')
      .leftJoin('employees as approver', 'shift_swaps.approver_id', 'approver.id')
      .where('shifts.restaurant_id', req.restaurantId)
      .select('shift_swaps.*',
        'shifts.date as ref_date', 'shifts.start_time', 'shifts.end_time',
        'requester.name as requester_name', 'target.name as target_name', 'approver.name as approver_name')
      .orderBy('shift_swaps.created_at', 'desc'),
    db('leave_requests')
      .join('employees', 'leave_requests.employee_id', 'employees.id')
      .leftJoin('employees as approver', 'leave_requests.approver_id', 'approver.id')
      .where('employees.restaurant_id', req.restaurantId)
      .select('leave_requests.*',
        db.raw('NULL as ref_date'), db.raw('NULL as start_time'), db.raw('NULL as end_time'),
        'employees.name as requester_name', db.raw('NULL as target_name'), 'approver.name as approver_name')
      .orderBy('leave_requests.created_at', 'desc'),
  ]);

  // Merge with type marker
  const all = [
    ...swaps.map(s => ({ ...s, _type: 'swap' })),
    ...leaves.map(l => ({ ...l, _type: 'leave' })),
  ];
  all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(all);
});

module.exports = router;
