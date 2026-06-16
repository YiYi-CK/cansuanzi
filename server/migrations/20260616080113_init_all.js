exports.up = async function (knex) {
  await knex.schema.createTable('restaurants', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('address', 255);
    t.string('phone', 20);
    t.string('timezone', 50).defaultTo('Australia/Perth');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('employees', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 100).notNullable();
    t.string('phone', 20);
    t.string('role', 20).defaultTo('employee');
    t.string('employment_type', 20).defaultTo('casual');
    t.string('position', 50);
    t.decimal('base_hourly_rate', 8, 2).defaultTo(0);
    t.decimal('saturday_loading', 3, 2).defaultTo(1.25);
    t.decimal('sunday_loading', 3, 2).defaultTo(1.50);
    t.decimal('public_holiday_loading', 3, 2).defaultTo(2.50);
    t.decimal('late_night_loading', 3, 2).defaultTo(1.50);
    t.decimal('casual_loading', 3, 2).defaultTo(0.25);
    t.boolean('active').defaultTo(1);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('employee_availabilities', (t) => {
    t.increments('id').primary();
    t.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.integer('day_of_week').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('shifts', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.date('date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.integer('break_minutes').defaultTo(0);
    t.string('area', 50);
    t.string('status', 20).defaultTo('scheduled');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE INDEX idx_shifts_restaurant_date ON shifts(restaurant_id, date)');

  await knex.schema.createTable('shift_swaps', (t) => {
    t.increments('id').primary();
    t.integer('shift_id').unsigned().notNullable().references('id').inTable('shifts').onDelete('CASCADE');
    t.integer('requester_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.integer('target_employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.text('reason');
    t.string('status', 20).defaultTo('pending');
    t.integer('approver_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('leave_requests', (t) => {
    t.increments('id').primary();
    t.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.text('reason');
    t.string('type', 20).defaultTo('unpaid');
    t.string('status', 20).defaultTo('pending');
    t.integer('approver_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('pos_daily_reports', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.date('date').notNullable();
    t.decimal('total_revenue', 10, 2).notNullable();
    t.decimal('total_cash', 10, 2).defaultTo(0);
    t.decimal('total_card', 10, 2).defaultTo(0);
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.raw('CREATE UNIQUE INDEX idx_pos_restaurant_date ON pos_daily_reports(restaurant_id, date)');

  await knex.schema.createTable('expense_entries', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.date('date').notNullable();
    t.string('category', 20).notNullable();
    t.decimal('amount', 10, 2).notNullable();
    t.string('description', 255);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('restaurant_settings', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().unique().references('id').inTable('restaurants').onDelete('CASCADE');
    t.time('operating_start').defaultTo('08:00');
    t.time('operating_end').defaultTo('21:00');
    t.time('break_start');
    t.time('break_end');
    t.text('operating_days').defaultTo('[1,2,3,4,5,6,7]');
    t.decimal('saturday_loading', 3, 2).defaultTo(1.25);
    t.decimal('sunday_loading', 3, 2).defaultTo(1.50);
    t.decimal('public_holiday_loading', 3, 2).defaultTo(2.50);
    t.decimal('late_night_loading', 3, 2).defaultTo(1.50);
    t.decimal('casual_loading', 3, 2).defaultTo(0.25);
    t.text('public_holidays');
    t.string('language', 10).defaultTo('zh');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('restaurant_settings');
  await knex.schema.dropTableIfExists('expense_entries');
  await knex.schema.dropTableIfExists('pos_daily_reports');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('shift_swaps');
  await knex.schema.dropTableIfExists('shifts');
  await knex.schema.dropTableIfExists('employee_availabilities');
  await knex.schema.dropTableIfExists('employees');
  await knex.schema.dropTableIfExists('restaurants');
};
