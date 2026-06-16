exports.up = async function (knex) {
  const hasStations = await knex.schema.hasColumn('restaurant_settings', 'stations');
  if (!hasStations) {
    await knex.schema.alterTable('restaurant_settings', (t) => {
      t.text('stations').defaultTo('["前台","厨房","大厅"]');
    });
  }
  const hasStationIds = await knex.schema.hasColumn('employees', 'station_ids');
  if (!hasStationIds) {
    await knex.schema.alterTable('employees', (t) => {
      t.text('station_ids');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('restaurant_settings', (t) => t.dropColumn('stations'));
  await knex.schema.alterTable('employees', (t) => t.dropColumn('station_ids'));
};
