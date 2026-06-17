const db = require('../config/db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

const router = require('express').Router();
router.use(auth);
const upload = multer({ dest: '/tmp/' });

/** 手动录入 POS 日报 */
router.post('/pos', role('owner'), async (req, res) => {
  const { date, total_revenue, total_cash, total_card, notes } = req.body;
  try {
    await db('pos_daily_reports').insert({
      restaurant_id: req.restaurantId, date, total_revenue,
      total_cash: total_cash || 0, total_card: total_card || 0, notes,
    }).onConflict(['restaurant_id', 'date']).merge();
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '保存失败' });
  }
});

/** CSV 导入 */
router.post('/pos/import-csv', role('owner'), upload.single('file'), async (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      try {
        let count = 0;
        for (const row of results) {
          const date = row.Date || row.date;
          const total = parseFloat(row.Total || row.total_revenue || 0);
          if (!date || !total) continue;
          await db('pos_daily_reports').insert({
            restaurant_id: req.restaurantId, date,
            total_revenue: total,
            total_cash: parseFloat(row.Cash || row.total_cash || 0),
            total_card: parseFloat(row.Card || row.total_card || 0),
          }).onConflict(['restaurant_id', 'date']).merge();
          count++;
        }
        fs.unlinkSync(req.file.path);
        res.json({ ok: true, imported: count });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: '导入失败' });
      }
    });
});

/** 查 POS 日报 */
router.get('/pos', role('owner'), async (req, res) => {
  const { date_from, date_to } = req.query;
  const query = db('pos_daily_reports').where({ restaurant_id: req.restaurantId });
  if (date_from) query.where('date', '>=', date_from);
  if (date_to) query.where('date', '<=', date_to);
  const rows = await query.orderBy('date', 'desc');
  res.json(rows);
});

/** 查单条日报 */
router.get('/pos/:id', role('owner'), async (req, res) => {
  const row = await db('pos_daily_reports').where({ id: req.params.id, restaurant_id: req.restaurantId }).first();
  if (!row) return res.status(404).json({ error: '日报不存在' });
  res.json(row);
});

/** 更新日报 */
router.put('/pos/:id', role('owner'), async (req, res) => {
  const { date, total_revenue, total_cash, total_card, notes } = req.body;
  const updated = await db('pos_daily_reports')
    .where({ id: req.params.id, restaurant_id: req.restaurantId })
    .update({ date, total_revenue, total_cash: total_cash || 0, total_card: total_card || 0, notes });
  if (!updated) return res.status(404).json({ error: '日报不存在' });
  res.json({ ok: true });
});

/** 删除日报 */
router.delete('/pos/:id', role('owner'), async (req, res) => {
  await db('pos_daily_reports').where({ id: req.params.id, restaurant_id: req.restaurantId }).del();
  res.json({ ok: true });
});

module.exports = router;
