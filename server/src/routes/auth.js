const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = require('express').Router();

/** 注册（创建餐馆 + owner） */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, restaurant_name, invite_code } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: '姓名、邮箱和密码为必填' });
    if (invite_code !== process.env.INVITE_CODE) return res.status(403).json({ error: '邀请码无效' });

    const exists = await db('employees').where({ email }).first();
    if (exists) return res.status(409).json({ error: '该邮箱已注册' });

    const [restaurantId] = await db('restaurants').insert({ name: restaurant_name || '我的餐馆' });

    const hash = await bcrypt.hash(password, 10);
    const [employeeId] = await db('employees').insert({
      restaurant_id: restaurantId,
      email, password_hash: hash, name,
      role: 'owner',
      base_hourly_rate: 0,
    });

    // 创建设置记录
    await db('restaurant_settings').insert({ restaurant_id: restaurantId });

    const token = jwt.sign({ id: employeeId }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: employeeId, name, email, role: 'owner', restaurantId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '注册失败' });
  }
});

/** 登录 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db('employees').where({ email, active: true }).first();
    if (!user) return res.status(401).json({ error: '邮箱或密码错误' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '邮箱或密码错误' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, restaurantId: user.restaurant_id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登录失败' });
  }
});

/** 获取当前用户 */
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, restaurantId: req.user.restaurant_id });
});

module.exports = router;
