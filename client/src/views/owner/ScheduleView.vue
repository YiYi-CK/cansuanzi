<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.schedule') }}</n-h2>

    <n-space style="margin-bottom: 16px">
      <n-date-picker v-model:value="weekStart" type="date" @update:value="fetchShifts" />
      <n-button @click="copyLastWeek" :loading="copyLoading">{{ t('schedule.copy_last_week') }}</n-button>
      <n-button @click="downloadPDF">📥 下载Excel</n-button>
    </n-space>

    <n-spin :show="loading">
      <!-- 无营业时间 -->
      <n-empty v-if="timeSlots.length === 0" description="请先在设置页配置营业时间" style="padding: 40px">
        <template #extra><n-button type="primary" @click="$router.push('/settings')">去设置</n-button></template>
      </n-empty>

      <template v-else>
        <!-- 排班网格 -->
        <div style="overflow-x: auto">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--n-border-color)">
            <thead>
              <tr>
                <th style="padding: 8px; width: 70px; background: var(--n-color-embedded); font-size: 12px"></th>
                <th v-for="d in weekDays" :key="d.date" style="padding: 8px; min-width: 120px; background: var(--n-color-embedded); text-align: center; font-size: 13px">
                  {{ d.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="slot in timeSlots" :key="slot.key">
                <td style="padding: 4px 6px; font-size: 11px; text-align: right; background: var(--n-color-embedded); color: var(--n-text-color-3); font-weight: 500; border-bottom: 1px solid var(--n-border-color)">
                  {{ slot.label }}
                </td>
                <td v-for="d in weekDays" :key="d.date" style="padding: 2px; vertical-align: top; border: 1px solid var(--n-border-color); min-height: 30px">
                  <template v-for="shift in getShiftsAt(d.date, slot.startTime)" :key="shift._key">
                    <n-popover v-if="shift.employee_id" trigger="click" placement="bottom-start">
                      <template #trigger>
                        <div :style="shiftBlockStyle(shift, slot.startTime)" @click.stop>
                          <div style="font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ shift._short || shift.employee_name }}</div>
                          <div style="font-size: 10px; opacity: 0.7">{{ shift._startDisplay || shift.start_time }}-{{ shift._endDisplay || shift.end_time }}</div>
                          <div v-if="shift.area" style="font-size: 10px; opacity: 0.5">{{ shift.area }}</div>
                        </div>
                      </template>
                      <div style="padding: 4px">
                        <div style="font-weight: 600; margin-bottom: 8px">{{ shift._label || (shift.employee_name + ' · ' + shift.start_time + '-' + shift.end_time) }}{{ shift.area ? ' · ' + shift.area : '' }}</div>
                        <n-space>
                          <n-button size="small" @click="openEdit(shift)">编辑</n-button>
                          <n-button size="small" type="error" @click="removeShift(shift.id)">删除</n-button>
                        </n-space>
                      </div>
                    </n-popover>
                    <div v-else :style="{ ...shiftBlockStyle(shift, slot.startTime), border: '1px dashed var(--n-border-color)', background: 'transparent' }" />
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- [+ 排班] -->
        <div style="overflow-x: auto; margin-top: 4px">
          <table style="width: 100%; border-collapse: collapse">
            <tr>
              <td style="width: 70px"></td>
              <td v-for="d in weekDays" :key="'btn-'+d.date" style="padding: 8px; text-align: center">
                <n-button size="tiny" type="primary" dashed @click="openAdd(d.date)">+ 排班</n-button>
              </td>
            </tr>
          </table>
        </div>
      </template>
    </n-spin>

    <!-- 新增/编辑弹窗 -->
    <n-modal preset="card" v-model:show="showAdd" :title="editingShift ? '编辑排班' : '新增排班'" style="width: 380px">
      <n-form :model="addForm" label-placement="left" label-width="70">
        <n-form-item label="员工">
          <n-select v-model:value="addForm.employee_id" :options="employeeOpts" placeholder="选择员工" />
        </n-form-item>
        <n-form-item label="工位">
          <n-select v-model:value="addForm.area" :options="areaOptions" placeholder="选择工位" />
        </n-form-item>
        <n-form-item label="时间">
          <n-space>
            <input type="time" v-model="addForm.start_time" :min="settings.operating_start || '08:00'" :max="settings.operating_end || '21:00'" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" />
            <span>—</span>
            <input type="time" v-model="addForm.end_time" :min="settings.operating_start || '08:00'" :max="settings.operating_end || '21:00'" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" />
          </n-space>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAdd = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="doSave" :disabled="!addForm.employee_id">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { shiftsAPI, employeesAPI, settingsAPI } from '../../api/endpoints';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

const { t, locale } = useI18n();
const message = useMessage();
const loading = ref(false);
const copyLoading = ref(false);
const weekStart = ref(null);
const shifts = ref([]);
const employees = ref([]);
const settings = ref({ operating_start: '08:00', operating_end: '21:00', break_start: '', break_end: '' });
const showAdd = ref(false);
const editingShift = ref(null);
const addForm = ref({ employee_id: null, area: '', start_time: '08:00', end_time: '14:00', _date: '' });

const employeeOpts = computed(() => {
  const date = addForm.value._date || weekDays.value[0]?.date || '';
  return employees.value
    .filter(e => !isOnLeave(e.id, date))
    .map(e => ({ label: e.name + (isOnLeave(e.id, date) ? ' (请假中)' : ''), value: e.id }));
});

function isOnLeave(empId, date) {
  if (!date) return false;
  return shifts.value.some(s => s.employee_id === empId && s.date === date && s.on_leave);
}

const areaOptions = computed(() => {
  if (!addForm.value.employee_id) return (settings.value?.stations || []).map(s => ({ label: s, value: s }));
  const emp = employees.value.find(e => e.id === addForm.value.employee_id);
  const ids = emp?.station_ids;
  const arr = typeof ids === 'string' ? JSON.parse(ids) : (ids || []);
  if (arr.length === 0) return (settings.value?.stations || []).map(s => ({ label: s, value: s }));
  return arr.map(s => ({ label: s, value: s }));
});

// 选员工后自动填第一个工位
watch(() => addForm.value.employee_id, () => { if (areaOptions.value.length > 0 && !editingShift.value) { addForm.value.area = areaOptions.value[0].value; } });

const timeSlots = computed(() => {
  const slots = [];
  const start = (settings.value?.operating_start || '08:00').trim();
  const end = (settings.value?.operating_end || '21:00').trim();
  const bs = (settings.value?.break_start || '').trim();
  const be = (settings.value?.break_end || '').trim();
  if (!start || !end) return slots;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return slots;
  let h = sh, m = sm;
  const endMin = eh * 60 + em;
  let bsMin = 0, beMin = 0;
  if (bs && be) {
    const [bsh, bsm] = bs.split(':').map(Number); const [beh, bem] = be.split(':').map(Number);
    if (!isNaN(bsh) && !isNaN(bsm) && !isNaN(beh) && !isNaN(bem)) { bsMin = bsh * 60 + bsm; beMin = beh * 60 + bem; }
  }
  for (let i = 0; i < 200; i++) {
    const curr = h * 60 + m;
    if (curr >= endMin) break;
    if (bsMin && beMin && curr >= bsMin && curr < beMin) { h = Math.floor(beMin / 60); m = beMin % 60; continue; }
    slots.push({ key: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, startTime: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` });
    m += 30; if (m >= 60) { h++; m -= 60; }
  }
  return slots;
});

const weekDays = computed(() => {
  const start = weekStart.value ? new Date(weekStart.value) : new Date();
  start.setDate(start.getDate() - start.getDay() + 1);
  const isZh = locale.value === 'zh';
  const names = isZh ? ['周一','周二','周三','周四','周五','周六','周日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const opDays = settings.value?.operating_days || [1,2,3,4,5,6,7];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const dayNum = d.getDay() || 7;
    if (!opDays.includes(dayNum)) return null;
    return { date: d.toISOString().split('T')[0], label: `${d.getMonth()+1}/${d.getDate()} ${names[i]}` };
  }).filter(Boolean);
});

function getShiftBlocks(date, time) {
  const blocks = [];
  const bs = (settings.value?.break_start || '').trim();
  const be = (settings.value?.break_end || '').trim();
  const hasBreak = bs && be;

  for (const shift of shifts.value) {
    if (shift.date !== date) continue;
    if (!shift.employee_id) {
      if (shift.start_time === time) blocks.push(shift);
      continue;
    }

    // 是否需要分割（跨午休）
    if (hasBreak && toMinutes(shift.start_time) < toMinutes(bs) && toMinutes(shift.end_time) > toMinutes(be)) {
      if (time === shift.start_time) {
        blocks.push({ ...shift, _key: `${shift.id}-am`, _label: `${shift.employee_name} · ${shift.start_time}-${bs}${shift.area?' · '+shift.area:''}`, _short: shift.employee_name, _endDisplay: bs });
      }
      if (time === be) {
        blocks.push({ ...shift, _key: `${shift.id}-pm`, _label: `${shift.employee_name} · ${be}-${shift.end_time}${shift.area?' · '+shift.area:''}`, _short: shift.employee_name, _startDisplay: be });
      }
    } else {
      if (shift.start_time === time) blocks.push(shift);
    }
  }
  return blocks;
}

function getShiftsAt(date, time) { return getShiftBlocks(date, time); }

function shiftBlockStyle(shift, slotTime) {
  const displayStart = shift._startDisplay || shift.start_time;
  if (displayStart !== slotTime) return { display: 'none' };
  // 换班红 / 请假红 / 正常绿
  const isWarning = shift.swap_id || shift.on_leave;
  const bg = isWarning ? '#FEF2F2' : '#F0FDF4';
  const border = isWarning ? '1px solid #FCA5A5' : '1px solid #86EFAC';
  return { background: bg, border, borderRadius: '4px', padding: '3px 5px', marginBottom: '2px', cursor: 'pointer', fontSize: '11px' };
}

function toMinutes(t) { if (!t || typeof t !== 'string') return 0; const p = t.split(':'); if (p.length !== 2) return 0; const [h, m] = p.map(Number); if (isNaN(h) || isNaN(m)) return 0; return h * 60 + m; }

function openAdd(date) { editingShift.value = null; addForm.value = { employee_id: null, area: '', start_time: (settings.value?.operating_start || '08:00'), end_time: (settings.value?.operating_end || '14:00'), _date: date }; showAdd.value = true; }
function openEdit(shift) { editingShift.value = shift; addForm.value = { employee_id: shift.employee_id, area: shift.area || '', start_time: shift.start_time, end_time: shift.end_time, _date: shift.date }; showAdd.value = true; }

async function doSave() {
  try {
    // 验证时间在营业范围内
    const opStart = settings.value?.operating_start || '08:00';
    const opEnd = settings.value?.operating_end || '21:00';
    const sMin = toMinutes(addForm.value.start_time);
    const eMin = toMinutes(addForm.value.end_time);
    if (sMin < toMinutes(opStart) || sMin > toMinutes(opEnd)) { message.error(`开始时间需在 ${opStart}-${opEnd} 之间`); return; }
    if (eMin < toMinutes(opStart) || eMin > toMinutes(opEnd)) { message.error(`结束时间需在 ${opStart}-${opEnd} 之间`); return; }
    if (sMin >= eMin) { message.error('结束时间必须晚于开始时间'); return; }

    const d = { employee_id: addForm.value.employee_id, area: addForm.value.area, start_time: addForm.value.start_time, end_time: addForm.value.end_time, date: addForm.value._date || weekDays.value[0].date };
    if (editingShift.value) await shiftsAPI.update(editingShift.value.id, d);
    else await shiftsAPI.create(d);
    showAdd.value = false; editingShift.value = null; message.success('保存成功'); fetchShifts();
  } catch (err) { message.error(err.response?.data?.error || '保存失败'); }
}

async function removeShift(id) { await shiftsAPI.remove(id); message.success('已删除'); fetchShifts(); }

async function copyLastWeek() {
  copyLoading.value = true;
  try {
    const lastStart = new Date(weekDays.value[0].date); lastStart.setDate(lastStart.getDate() - 7);
    const lastEnd = new Date(lastStart); lastEnd.setDate(lastEnd.getDate() + 6);
    const lastShifts = (await shiftsAPI.list(lastStart.toISOString().split('T')[0], lastEnd.toISOString().split('T')[0])).data;
    let count = 0;
    for (const s of lastShifts) { if (!s.employee_id) continue; const nd = new Date(s.date); nd.setDate(nd.getDate() + 7); await shiftsAPI.create({ employee_id: s.employee_id, date: nd.toISOString().split('T')[0], start_time: s.start_time, end_time: s.end_time, area: s.area }); count++; }
    message.success(`已复制 ${count} 个排班`); fetchShifts();
  } catch (err) { message.error('复制失败'); } finally { copyLoading.value = false; }
}

async function fetchShifts() {
  loading.value = true;
  try {
    const from = weekDays.value[0]?.date, to = weekDays.value[weekDays.value.length - 1]?.date;
    if (!from || !to) return;
    const res = await shiftsAPI.list(from, to);
    shifts.value = res.data;
    for (const s of shifts.value) { s.employee_name = employees.value.find(e => e.id === s.employee_id)?.name || null; }
  } catch (err) { console.error(err); message.error('加载排班失败'); } finally { loading.value = false; }
}

function downloadPDF() {
  downloadExcel();
}

async function downloadExcel() {
  const wd = weekDays.value;
  const ts = timeSlots.value;
  if (wd.length === 0 || ts.length === 0) return message.warning('没有排班数据可导出');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('排班表');

  // 标题行
  ws.mergeCells(1, 1, 1, wd.length + 1);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `排班表  ${wd[0]?.date || ''} ~ ${wd[wd.length-1]?.date || ''}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'EA580C' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // 表头
  const headerRow = ws.getRow(2);
  headerRow.getCell(1).value = '时间';
  wd.forEach((d, i) => { headerRow.getCell(i + 2).value = d.label; });
  headerRow.height = 22;
  headerRow.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EA580C' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  // 数据行
  ts.forEach((slot, ri) => {
    const row = ws.getRow(ri + 3);
    row.getCell(1).value = slot.label;
    row.getCell(1).font = { size: 9 };
    row.getCell(1).alignment = { vertical: 'middle' };
    row.height = 24;

    wd.forEach((d, ci) => {
      const cell = row.getCell(ci + 2);
      const shifts = getShiftsAt(d.date, slot.startTime).filter(s => s.employee_id);
      if (shifts.length > 0) {
        cell.value = shifts.map(s => `${s._short || s.employee_name}${s.area ? ' · '+s.area : ''}\n${s._startDisplay || s.start_time}-${s._endDisplay || s.end_time}`).join('\n');
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7ED' } };
        cell.font = { size: 9, bold: true, color: { argb: '9A3412' } };
      } else {
        cell.font = { size: 9, color: { argb: 'D6D3D1' } };
      }
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin', color: { argb: 'E7E5E4' } }, bottom: { style: 'thin', color: { argb: 'E7E5E4' } }, left: { style: 'thin', color: { argb: 'E7E5E4' } }, right: { style: 'thin', color: { argb: 'E7E5E4' } } };
    });
  });

  // 交替行颜色
  for (let r = 3; r < ts.length + 3; r++) {
    if ((r - 3) % 2 === 1) {
      ws.getRow(r).eachCell(cell => {
        if (!cell.fill || cell.fill.fgColor.argb === 'FFF7ED') cell.fill = null;
        if (!cell.fill || !cell.fill.fgColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAF9' } };
      });
    }
  }

  // 列宽
  ws.getColumn(1).width = 8;
  for (let i = 2; i <= wd.length + 1; i++) ws.getColumn(i).width = 18;

  // 下载
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `schedule-${wd[0]?.date || 'week'}.xlsx`; a.click();
  URL.revokeObjectURL(url);
  message.success('排班表已下载');
}

onMounted(async () => {
  try { employees.value = (await employeesAPI.list()).data; } catch (e) { console.error(e); }
  try { settings.value = (await settingsAPI.get()).data; } catch (e) { console.error(e); }
  const today = new Date(); today.setDate(today.getDate() - today.getDay() + 1);
  weekStart.value = new Date(today).getTime();
  fetchShifts();
});
</script>
