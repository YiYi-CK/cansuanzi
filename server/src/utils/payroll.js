const db = require('../config/db');

/** 默认 Award Rate */
const DEFAULTS = {
  saturday_loading: 1.25,
  sunday_loading: 1.50,
  public_holiday_loading: 2.50,
  late_night_loading: 1.50,
  casual_loading: 0.25,
};

/**
 * 计算单个班次的工时和工资
 * @param {Object} shift    班次 {date, start_time, end_time, break_minutes, area}
 * @param {Object} employee 员工 {base_hourly_rate, employment_type, ...loadings}
 * @param {Object} settings 餐馆设置 {public_holidays: [], ...loadings}
 * @returns {{ hours: number, wage: number, details: {} }}
 */
function calcShiftWage(shift, employee, settings = {}) {
  const rate = parseFloat(employee.base_hourly_rate) || 0;
  const start = new Date(`${shift.date}T${shift.start_time}`);
  const end = new Date(`${shift.date}T${shift.end_time}`);
  let totalMinutes = (end - start) / 60000 - (shift.break_minutes || 0);
  if (totalMinutes <= 0) return { hours: 0, wage: 0, details: {} };

  let weekdayMinutes = 0, saturdayMinutes = 0, sundayMinutes = 0, holidayMinutes = 0, lateNightMinutes = 0;

  const date = new Date(shift.date);
  const dayOfWeek = date.getDay(); // 0=Sun … 6=Sat
  const holidays = typeof settings.public_holidays === 'string' ? JSON.parse(settings.public_holidays || '[]') : (settings.public_holidays || []);
  const isHoliday = holidays.some(h => h.date === shift.date);

  // 根据日期类型分配所有分钟
  if (isHoliday) {
    holidayMinutes = totalMinutes;
  } else if (dayOfWeek === 0) {
    sundayMinutes = totalMinutes;
  } else if (dayOfWeek === 6) {
    saturdayMinutes = totalMinutes;
  } else {
    weekdayMinutes = totalMinutes;
  }

  // Late night (22:00-06:00 次日) — 简化：如果结束时间晚于 22:00，粗略算
  const endHour = parseInt(shift.end_time.split(':')[0]);
  const startHour = parseInt(shift.start_time.split(':')[0]);
  if (endHour >= 22 || startHour < 6) {
    // 粗略: 总分钟数的 30% 算晚班 (MVP 简化)
    lateNightMinutes = Math.round(totalMinutes * 0.3);
    weekdayMinutes -= lateNightMinutes;
    if (weekdayMinutes < 0) weekdayMinutes = 0;
  }

  const satLoading = parseFloat(settings.saturday_loading || DEFAULTS.saturday_loading);
  const sunLoading = parseFloat(settings.sunday_loading || DEFAULTS.sunday_loading);
  const holLoading = parseFloat(settings.public_holiday_loading || DEFAULTS.public_holiday_loading);
  const lateLoading = parseFloat(settings.late_night_loading || DEFAULTS.late_night_loading);
  const casualLoading = employee.employment_type === 'casual' ? parseFloat(settings.casual_loading || DEFAULTS.casual_loading) : 0;

  const wage =
    (weekdayMinutes / 60) * rate * (1 + casualLoading) +
    (saturdayMinutes / 60) * rate * satLoading * (1 + casualLoading) +
    (sundayMinutes / 60) * rate * sunLoading * (1 + casualLoading) +
    (holidayMinutes / 60) * rate * holLoading * (1 + casualLoading) +
    (lateNightMinutes / 60) * rate * lateLoading * (1 + casualLoading);

  return {
    hours: totalMinutes / 60,
    wage: Math.round(wage * 100) / 100,
    details: { weekdayMinutes, saturdayMinutes, sundayMinutes, holidayMinutes, lateNightMinutes },
  };
}

/**
 * 查询某个餐馆在日期范围内的工资汇总
 */
async function getPayroll(restaurantId, dateFrom, dateTo) {
  const settings = await db('restaurant_settings').where({ restaurant_id: restaurantId }).first() || {};
  const employees = await db('employees').where({ restaurant_id: restaurantId });
  const shifts = await db('shifts')
    .where({ restaurant_id: restaurantId })
    .whereBetween('date', [dateFrom, dateTo])
    .whereIn('status', ['scheduled', 'completed']);

  const result = [];
  let totalHours = 0, totalWage = 0;

  for (const emp of employees) {
    const empShifts = shifts.filter(s => s.employee_id === emp.id);
    let empHours = 0, empWage = 0;
    let weekdayHrs = 0, satHrs = 0, sunHrs = 0, holHrs = 0, lateHrs = 0;

    for (const shift of empShifts) {
      const calc = calcShiftWage(shift, emp, settings);
      empHours += calc.hours;
      empWage += calc.wage;
      const d = calc.details;
      weekdayHrs += d.weekdayMinutes / 60;
      satHrs += d.saturdayMinutes / 60;
      sunHrs += d.sundayMinutes / 60;
      holHrs += d.holidayMinutes / 60;
      lateHrs += d.lateNightMinutes / 60;
    }

    if (empHours > 0) {
      result.push({
        employee_id: emp.id,
        name: emp.name,
        employment_type: emp.employment_type,
        base_rate: parseFloat(emp.base_hourly_rate),
        total_hours: Math.round(empHours * 10) / 10,
        weekday_hours: Math.round(weekdayHrs * 10) / 10,
        saturday_hours: Math.round(satHrs * 10) / 10,
        sunday_hours: Math.round(sunHrs * 10) / 10,
        holiday_hours: Math.round(holHrs * 10) / 10,
        late_night_hours: Math.round(lateHrs * 10) / 10,
        estimated_wage: Math.round(empWage * 100) / 100,
      });
      totalHours += empHours;
      totalWage += empWage;
    }
  }

  return {
    date_from: dateFrom,
    date_to: dateTo,
    employees: result,
    total_hours: Math.round(totalHours * 10) / 10,
    total_wage: Math.round(totalWage * 100) / 100,
  };
}

module.exports = { DEFAULTS, calcShiftWage, getPayroll };
