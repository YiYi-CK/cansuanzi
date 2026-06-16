const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('employees').where({ id: decoded.id }).first();
    if (!user || !user.active) {
      return res.status(401).json({ error: '用户不存在或已禁用' });
    }
    req.user = user;
    req.restaurantId = user.restaurant_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
};
