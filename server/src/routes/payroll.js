const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getPayroll } = require('../utils/payroll');

const router = require('express').Router();
router.use(auth);

/** 工资概览 — 返回每个员工的工资信息 + 支付状态 */
router.get('/', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    const result = await getPayroll(req.restaurantId, date_from, date_to);
    // 查询支付记录，标记已付/未付
    if (date_from && date_to) {
      const payments = await db('payments')
        .where({ restaurant_id: req.restaurantId })
        .where('period_start', date_from)
        .where('period_end', date_to)
        .select('employee_id', 'method', 'paid_at');
      const paidMap = {};
      for (const p of payments) paidMap[p.employee_id] = p;

      for (const emp of result.employees) {
        const pay = paidMap[emp.employee_id];
        if (pay) {
          emp.payment_status = 'paid';
          emp.payment_method = pay.method;
          emp.paid_at = pay.paid_at;
        } else {
          emp.payment_status = 'unpaid';
        }
      }
    } else {
      for (const emp of result.employees) emp.payment_status = 'unpaid';
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '计算失败' });
  }
});

/** 支付工资 */
router.post('/pay', role('owner'), async (req, res) => {
  const { employee_id, period_start, period_end, amount, method } = req.body;
  if (!employee_id || !period_start || !period_end || amount === undefined || !method) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  if (!['cash', 'transfer'].includes(method)) {
    return res.status(400).json({ error: '支付方式仅支持 cash 或 transfer' });
  }
  try {
    // 检查是否已支付
    const existing = await db('payments')
      .where({ restaurant_id: req.restaurantId, employee_id, period_start, period_end })
      .first();
    if (existing) return res.status(409).json({ error: '该周期已支付' });

    const [id] = await db('payments').insert({
      restaurant_id: req.restaurantId,
      employee_id,
      period_start,
      period_end,
      amount: Math.round(amount * 100) / 100,
      method,
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '支付记录失败' });
  }
});

/** 应付工资列表 — 所有未付员工 */
router.get('/unpaid', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  if (!date_from || !date_to) return res.status(400).json({ error: '需要 date_from 和 date_to' });
  try {
    const result = await getPayroll(req.restaurantId, date_from, date_to);
    const paidIds = (await db('payments')
      .where({ restaurant_id: req.restaurantId, period_start: date_from, period_end: date_to })
      .select('employee_id'))
      .map(p => p.employee_id);
    const unpaid = result.employees.filter(e => !paidIds.includes(e.employee_id));
    res.json({
      date_from,
      date_to,
      employees: unpaid,
      total_hours: unpaid.reduce((s, e) => s + e.total_hours, 0),
      total_wage: unpaid.reduce((s, e) => s + e.estimated_wage, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
