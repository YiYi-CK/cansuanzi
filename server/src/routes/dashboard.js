const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getPayroll } = require('../utils/payroll');

const router = require('express').Router();
router.use(auth);

/** 收支看板数据 */
router.get('/', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;

  try {
    // POS 营收
    const posQuery = db('pos_daily_reports').where({ restaurant_id: req.restaurantId });
    if (date_from) posQuery.where('date', '>=', date_from);
    if (date_to) posQuery.where('date', '<=', date_to);
    const posRows = await posQuery;
    const totalRevenue = posRows.reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);

    // 支出（按类别）
    const expQuery = db('expense_entries').where({ restaurant_id: req.restaurantId });
    if (date_from) expQuery.where('date', '>=', date_from);
    if (date_to) expQuery.where('date', '<=', date_to);
    const expRows = await expQuery;

    const expenses = { food: 0, beverage: 0, rent: 0, utilities: 0, other: 0 };
    for (const r of expRows) {
      expenses[r.category] = (expenses[r.category] || 0) + parseFloat(r.amount || 0);
    }

    // 人工成本（从排班计算）
    let laborCost = 0;
    if (date_from && date_to) {
      const payroll = await getPayroll(req.restaurantId, date_from, date_to);
      laborCost = payroll.total_wage;
    }

    const totalExpenses = expenses.food + expenses.beverage + expenses.rent + expenses.utilities + expenses.other + laborCost;
    const netProfit = totalRevenue - totalExpenses;

    // 支出构成
    const breakdown = [
      { category: '人工', amount: laborCost, percentage: totalExpenses > 0 ? Math.round(laborCost / totalExpenses * 100) : 0 },
      { category: '食材', amount: expenses.food, percentage: totalExpenses > 0 ? Math.round(expenses.food / totalExpenses * 100) : 0 },
      { category: '饮料', amount: expenses.beverage, percentage: totalExpenses > 0 ? Math.round(expenses.beverage / totalExpenses * 100) : 0 },
      { category: '房租', amount: expenses.rent, percentage: totalExpenses > 0 ? Math.round(expenses.rent / totalExpenses * 100) : 0 },
      { category: '水电', amount: expenses.utilities, percentage: totalExpenses > 0 ? Math.round(expenses.utilities / totalExpenses * 100) : 0 },
      { category: '其他', amount: expenses.other, percentage: totalExpenses > 0 ? Math.round(expenses.other / totalExpenses * 100) : 0 },
    ].filter(e => e.amount > 0);

    // 7天趋势
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(date_to || new Date());
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const dayRevenue = posRows.filter(r => r.date === ds).reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);
      trend.push({ date: ds, revenue: dayRevenue });
    }

    // 今日排班
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = await db('shifts')
      .join('employees', 'shifts.employee_id', 'employees.id')
      .where({ 'shifts.restaurant_id': req.restaurantId, 'shifts.date': today })
      .select('shifts.*', 'employees.name as employee_name')
      .orderBy('shifts.start_time');

    res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      breakdown,
      trend,
      todayShifts: todayShifts.map(s => ({
        id: s.id, name: s.employee_name || null,
        start_time: s.start_time, end_time: s.end_time,
        area: s.area, status: s.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '看板数据获取失败' });
  }
});

module.exports = router;
