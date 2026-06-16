exports.up = async function (knex) {
  // 1. 餐馆
  await knex.schema.createTable('restaurants', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('address', 255);
    t.string('phone', 20);
    t.string('timezone', 50).defaultTo('Australia/Perth');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 2. 员工（含登录）
  await knex.schema.createTable('employees', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 100).notNullable();
    t.string('phone', 20);
    t.enu('role', ['owner', 'manager', 'employee']).defaultTo('employee');
    t.enu('employment_type', ['full_time', 'part_time', 'casual']).defaultTo('casual');
    t.decimal('base_hourly_rate', 8, 2).defaultTo(0);
    t.decimal('saturday_loading', 3, 2).defaultTo(1.25);
    t.decimal('sunday_loading', 3, 2).defaultTo(1.50);
    t.decimal('public_holiday_loading', 3, 2).defaultTo(2.50);
    t.decimal('late_night_loading', 3, 2).defaultTo(1.50);
    t.decimal('casual_loading', 3, 2).defaultTo(0.25);
    t.boolean('active').defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 3. 员工可用时间
  await knex.schema.createTable('employee_availabilities', (t) => {
    t.increments('id').primary();
    t.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.integer('day_of_week').notNullable().comment('0=Sun … 6=Sat');
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 4. 班次
  await knex.schema.createTable('shifts', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.integer('employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.date('date').notNullable();
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.integer('break_minutes').defaultTo(0);
    t.string('area', 50);
    t.enu('status', ['scheduled', 'completed', 'cancelled', 'swapped']).defaultTo('scheduled');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index(['restaurant_id', 'date']);
  });

  // 5. 换班申请
  await knex.schema.createTable('shift_swaps', (t) => {
    t.increments('id').primary();
    t.integer('shift_id').unsigned().notNullable().references('id').inTable('shifts').onDelete('CASCADE');
    t.integer('requester_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.integer('target_employee_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.text('reason');
    t.enu('status', ['pending', 'approved', 'rejected', 'cancelled']).defaultTo('pending');
    t.integer('approver_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 6. 请假
  await knex.schema.createTable('leave_requests', (t) => {
    t.increments('id').primary();
    t.integer('employee_id').unsigned().notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.text('reason');
    t.enu('type', ['annual', 'sick', 'unpaid']).defaultTo('unpaid');
    t.enu('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
    t.integer('approver_id').unsigned().references('id').inTable('employees').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 7. 排班模板
  await knex.schema.createTable('shift_templates', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    t.integer('day_of_week').nullable().comment('NULL=全周通用, 0=Sun … 6=Sat');
    t.time('start_time').notNullable();
    t.time('end_time').notNullable();
    t.integer('break_minutes').defaultTo(0);
    t.string('area', 50);
    t.boolean('is_system').defaultTo(false).comment('系统预置模板不能删');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 8. POS 日报
  await knex.schema.createTable('pos_daily_reports', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.date('date').notNullable();
    t.decimal('total_revenue', 10, 2).notNullable();
    t.decimal('total_cash', 10, 2).defaultTo(0);
    t.decimal('total_card', 10, 2).defaultTo(0);
    t.text('notes');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.unique(['restaurant_id', 'date']);
  });

  // 9. 支出条目
  await knex.schema.createTable('expense_entries', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().references('id').inTable('restaurants').onDelete('CASCADE');
    t.date('date').notNullable();
    t.enu('category', ['food', 'beverage', 'rent', 'utilities', 'other']).notNullable();
    t.decimal('amount', 10, 2).notNullable();
    t.string('description', 255);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 10. 餐馆设置
  await knex.schema.createTable('restaurant_settings', (t) => {
    t.increments('id').primary();
    t.integer('restaurant_id').unsigned().notNullable().unique().references('id').inTable('restaurants').onDelete('CASCADE');
    t.decimal('saturday_loading', 3, 2).defaultTo(1.25);
    t.decimal('sunday_loading', 3, 2).defaultTo(1.50);
    t.decimal('public_holiday_loading', 3, 2).defaultTo(2.50);
    t.decimal('late_night_loading', 3, 2).defaultTo(1.50);
    t.decimal('casual_loading', 3, 2).defaultTo(0.25);
    t.json('public_holidays').comment('手动标记的假日 [{date, name}]');
    t.string('language', 10).defaultTo('zh');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('restaurant_settings');
  await knex.schema.dropTableIfExists('expense_entries');
  await knex.schema.dropTableIfExists('pos_daily_reports');
  await knex.schema.dropTableIfExists('shift_templates');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('shift_swaps');
  await knex.schema.dropTableIfExists('shifts');
  await knex.schema.dropTableIfExists('employee_availabilities');
  await knex.schema.dropTableIfExists('employees');
  await knex.schema.dropTableIfExists('restaurants');
};
