/**
 * 角色权限检查中间件
 * @param  {...string} roles  允许的角色列表
 */
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: '权限不足' });
  }
  next();
};
