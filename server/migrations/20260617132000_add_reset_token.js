exports.up = function (knex) {
  return knex.schema.alterTable('employees', (table) => {
    table.string('reset_token');
    table.datetime('reset_token_expires');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('employees', (table) => {
    table.dropColumn('reset_token');
    table.dropColumn('reset_token_expires');
  });
};
