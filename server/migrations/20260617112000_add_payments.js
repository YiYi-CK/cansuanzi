/**
 * 添加 payments 表来记录工资支付
 * type: payment (正常支付) / advance (预付)
 * 一个员工/周期可以有多条支付记录（例如现金+转账各一笔）
 */
exports.up = function (knex) {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants');
    table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('method').notNullable(); // cash | transfer
    table.string('type').notNullable().defaultTo('payment'); // payment | advance
    table.datetime('paid_at').defaultTo(knex.fn.now());
    table.string('notes');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payments');
};
