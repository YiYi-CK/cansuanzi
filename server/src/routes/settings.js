const db = require('../config/db');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { DEFAULTS } = require('../utils/payroll');

const router = require('express').Router();
router.use(auth);

/** 获取设置 */
router.get('/', role('owner'), async (req, res) => {
  let settings = await db('restaurant_settings').where({ restaurant_id: req.restaurantId }).first();
  if (!settings) {
    await db('restaurant_settings').insert({ restaurant_id: req.restaurantId });
    settings = await db('restaurant_settings').where({ restaurant_id: req.restaurantId }).first();
  }

  const restaurant = await db('restaurants').where({ id: req.restaurantId }).first();

  res.json({
    restaurant_name: restaurant.name,
    timezone: restaurant.timezone,
    saturday_loading: parseFloat(settings.saturday_loading),
    sunday_loading: parseFloat(settings.sunday_loading),
    public_holiday_loading: parseFloat(settings.public_holiday_loading),
    late_night_loading: parseFloat(settings.late_night_loading),
    casual_loading: parseFloat(settings.casual_loading),
    public_holidays: settings.public_holidays || [],
    language: settings.language || 'zh',
    defaults: DEFAULTS, // 方便前端做重置
  });
});

/** 更新设置 */
router.put('/', role('owner'), async (req, res) => {
  const {
    restaurant_name, timezone,
    saturday_loading, sunday_loading, public_holiday_loading, late_night_loading, casual_loading,
    public_holidays, language,
  } = req.body;

  if (restaurant_name) {
    await db('restaurants').where({ id: req.restaurantId }).update({ name: restaurant_name });
  }
  if (timezone) {
    await db('restaurants').where({ id: req.restaurantId }).update({ timezone });
  }

  const updates = { updated_at: db.fn.now() };
  if (saturday_loading !== undefined) updates.saturday_loading = saturday_loading;
  if (sunday_loading !== undefined) updates.sunday_loading = sunday_loading;
  if (public_holiday_loading !== undefined) updates.public_holiday_loading = public_holiday_loading;
  if (late_night_loading !== undefined) updates.late_night_loading = late_night_loading;
  if (casual_loading !== undefined) updates.casual_loading = casual_loading;
  if (public_holidays !== undefined) updates.public_holidays = JSON.stringify(public_holidays);
  if (language !== undefined) updates.language = language;

  await db('restaurant_settings').where({ restaurant_id: req.restaurantId }).update(updates);
  res.json({ ok: true });
});

module.exports = router;
