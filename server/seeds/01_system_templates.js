exports.seed = async function (knex) {
  await knex('shift_templates').where('is_system', true).del();

  await knex('shift_templates').insert([
    { name: '早班厨房', day_of_week: null, start_time: '08:00', end_time: '14:00', break_minutes: 0, area: 'kitchen', is_system: true, restaurant_id: null },
    { name: '早班前台', day_of_week: null, start_time: '08:00', end_time: '14:00', break_minutes: 0, area: 'front', is_system: true, restaurant_id: null },
    { name: '午班厨房', day_of_week: null, start_time: '11:00', end_time: '17:00', break_minutes: 30, area: 'kitchen', is_system: true, restaurant_id: null },
    { name: '午班前台', day_of_week: null, start_time: '11:00', end_time: '17:00', break_minutes: 30, area: 'front', is_system: true, restaurant_id: null },
    { name: '晚班厨房', day_of_week: null, start_time: '14:00', end_time: '21:00', break_minutes: 30, area: 'kitchen', is_system: true, restaurant_id: null },
    { name: '晚班前台', day_of_week: null, start_time: '14:00', end_time: '21:00', break_minutes: 30, area: 'front', is_system: true, restaurant_id: null },
  ]);
};
