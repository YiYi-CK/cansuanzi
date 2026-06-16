const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);

/** 新增支出 */
router.post('/', role('owner'), async (req, res) => {
  const { date, category, amount, description } = req.body;
  const [id] = await db('expense_entries').insert({
    restaurant_id: req.restaurantId, date, category, amount, description,
  });
  res.status(201).json({ id });
});

/** 查支出 */
router.get('/', role('owner'), async (req, res) => {
  const { date_from, date_to, category } = req.query;
  const query = db('expense_entries').where({ restaurant_id: req.restaurantId });
  if (date_from) query.where('date', '>=', date_from);
  if (date_to) query.where('date', '<=', date_to);
  if (category) query.where('category', category);
  const rows = await query.orderBy('date', 'desc');
  res.json(rows);
});

/** 删除支出 */
router.delete('/:id', role('owner'), async (req, res) => {
  await db('expense_entries').where({ id: req.params.id, restaurant_id: req.restaurantId }).del();
  res.json({ ok: true });
});

module.exports = router;
