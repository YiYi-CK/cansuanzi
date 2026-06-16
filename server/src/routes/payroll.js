const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { getPayroll } = require('../utils/payroll');

const router = require('express').Router();
router.use(auth);

/** 工资概览 */
router.get('/', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    const result = await getPayroll(req.restaurantId, date_from, date_to);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '计算失败' });
  }
});

module.exports = router;
