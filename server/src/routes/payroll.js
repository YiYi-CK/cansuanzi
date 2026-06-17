const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getPayroll } = require('../utils/payroll');

const router = require('express').Router();
router.use(auth);

/**
 * 根据支付总额 vs 应付工资判断状态
 *   0                  → unpaid 未付
 *   >0 且 < 应付       → partially_paid 未付完
 *   = 应付             → paid 已付
 *   > 应付             → prepaid 预付
 */
function deriveStatus(paidTotal, owed) {
  if (!paidTotal || paidTotal <= 0) return 'unpaid';
  if (paidTotal < owed) return 'partially_paid';
  if (paidTotal === owed) return 'paid';
  return 'prepaid';
}

/** 工资概览 — 返回每个员工的工资信息 + 支付状态 */
router.get('/', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    const result = await getPayroll(req.restaurantId, date_from, date_to);
    if (date_from && date_to) {
      const payments = await db('payments')
        .where({ restaurant_id: req.restaurantId })
        .where('period_start', date_from)
        .where('period_end', date_to)
        .select('employee_id', 'method', 'amount', 'paid_at');
      // 汇总支付金额/人
      const payMap = {};
      for (const p of payments) {
        if (!payMap[p.employee_id]) payMap[p.employee_id] = { total: 0, methods: [] };
        payMap[p.employee_id].total += parseFloat(p.amount);
        if (!payMap[p.employee_id].methods.includes(p.method)) {
          payMap[p.employee_id].methods.push(p.method);
        }
      }

      for (const emp of result.employees) {
        const pay = payMap[emp.employee_id];
        if (!pay) {
          emp.payment_status = 'unpaid';
        } else {
          emp.payment_status = deriveStatus(pay.total, emp.estimated_wage);
          emp.payment_method = pay.methods.join('+');
          emp.paid_amount = Math.round(pay.total * 100) / 100;
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

/** 支付工资 — 支持现金+转账拆分支付 */
router.post('/pay', role('owner'), async (req, res) => {
  const { employee_id, period_start, period_end, payments: payItems } = req.body;
  if (!employee_id || !period_start || !period_end || !payItems || payItems.length === 0) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  try {
    const inserted = [];
    for (const item of payItems) {
      if (!item.method || !['cash', 'transfer'].includes(item.method)) {
        return res.status(400).json({ error: `不支持的支付方式: ${item.method}` });
      }
      if (!item.amount || item.amount <= 0) continue;
      const [id] = await db('payments').insert({
        restaurant_id: req.restaurantId,
        employee_id,
        period_start,
        period_end,
        amount: Math.round(parseFloat(item.amount) * 100) / 100,
        method: item.method,
        notes: item.notes || null,
      });
      inserted.push(id);
    }
    res.status(201).json({ ids: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '支付记录失败' });
  }
});

/** 应付工资列表 — 已付清的 + 预付的都不显示 */
router.get('/unpaid', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  if (!date_from || !date_to) return res.status(400).json({ error: '需要 date_from 和 date_to' });
  try {
    const result = await getPayroll(req.restaurantId, date_from, date_to);
    // 查所有支付（含预付）
    const payments = await db('payments')
      .where({ restaurant_id: req.restaurantId, period_start: date_from, period_end: date_to })
      .select('employee_id', 'amount');
    const payMap = {};
    for (const p of payments) {
      if (!payMap[p.employee_id]) payMap[p.employee_id] = 0;
      payMap[p.employee_id] += parseFloat(p.amount);
    }

    const unpaid = result.employees.filter(e => {
      const paid = payMap[e.employee_id] || 0;
      return paid < e.estimated_wage; // 没付清 / 没付 才算应付
    }).map(e => ({
      ...e,
      paid_amount: payMap[e.employee_id] || 0,
      remaining: Math.round((e.estimated_wage - (payMap[e.employee_id] || 0)) * 100) / 100,
    }));

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
