/**
 * 添加 payments 表来记录工资支付
 */
exports.up = function (knex) {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants');
    table.integer('employee_id').unsigned().notNullable().references('id').inTable('employees');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('method').notNullable().defaultTo('cash'); // cash | transfer
    table.datetime('paid_at').defaultTo(knex.fn.now());
    table.string('notes');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payments');
};
