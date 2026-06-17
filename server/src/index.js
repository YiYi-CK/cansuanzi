require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件 — 前端 dist
app.use(express.static(path.join(__dirname, '../../client/dist')));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPA fallback — 所有非 /api 请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍊 餐算子 API running on port ${PORT}`);
});
