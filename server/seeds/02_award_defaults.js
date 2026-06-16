/** Award Rate 默认值 — 用于计算和重置 */
exports.seed = async function (knex) {
  // 种子数据以备参考，实际运行时从 DEFAULT_AWARD 常量读取
  console.log('Award Rate defaults: Saturday 1.25x, Sunday 1.50x, Public Holiday 2.50x, Late Night 1.50x, Casual +25%');
};
