<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.schedule') }}</n-h2>
    <n-space style="margin-bottom: 16px">
      <n-date-picker v-model:value="weekStart" type="date" @update:value="fetchShifts" />
      <n-select v-model:value="selectedTemplate" :options="templateOptions" :placeholder="t('schedule.apply_template')" style="width: 180px" @update:value="applyTemplate" />
      <n-button @click="copyLastWeek">{{ t('schedule.copy_last_week') }}</n-button>
      <n-button type="primary" :loading="saving" @click="saveAll">{{ t('schedule.save_schedule') }}</n-button>
    </n-space>

    <n-spin :show="loading">
      <n-empty v-if="!loading && allSlots.length === 0" :description="t('schedule.no_shifts')" style="padding: 40px" />
      <div v-else style="overflow-x: auto">
        <table style="width: 100%; border-collapse: collapse">
          <thead>
            <tr>
              <th style="padding: 8px; text-align: left; width: 120px"></th>
              <th v-for="d in weekDays" :key="d.date" style="padding: 8px; min-width: 130px">{{ d.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.label">
              <td style="padding: 8px; font-weight: 600; vertical-align: top">{{ slot.label }}</td>
              <td v-for="d in weekDays" :key="d.date + slot.start" style="padding: 4px; vertical-align: top">
                <div
                  v-for="shift in getShiftsFor(d.date, slot.start, slot.end)"
                  :key="shift._key"
                  :style="{ padding: '8px', marginBottom: '4px', borderRadius: '6px', background: shift.employee_id ? '#FFF7ED' : '#FFF1F2', border: shift.employee_id ? '1px solid #FDBA74' : '1px dashed #FCA5A5', cursor: 'pointer' }"
                  @click="handleCellClick(d.date, slot.start, slot.end, shift)"
                >
                  <span v-if="shift.employee_id" style="font-size: 13px; font-weight: 500">{{ shift.employee_name }}</span>
                  <span v-else style="font-size: 13px; color: #DC2626">{{ t('schedule.vacant_slot') }}</span>
                  <br />
                  <span style="font-size: 11px; color: #78716C">{{ slot.start }}-{{ slot.end }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </n-spin>

    <!-- 分配给谁弹窗 -->
    <n-modal v-model:show="showAssign" title="分配员工" style="width: 350px">
      <n-select v-model:value="assignEmployeeId" :options="employeeOptions" placeholder="选择员工" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAssign = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="doAssign">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { shiftsAPI, employeesAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const loading = ref(false);
const saving = ref(false);
const weekStart = ref(null);
const shifts = ref([]);
const employees = ref([]);
const templates = ref([]);
const selectedTemplate = ref(null);
const showAssign = ref(false);
const assignSlot = ref(null);
const assignEmployeeId = ref(null);

const timeSlots = [
  { label: '早班', start: '08:00', end: '14:00' },
  { label: '午班', start: '11:00', end: '17:00' },
  { label: '晚班', start: '14:00', end: '21:00' },
];

const weekDays = computed(() => {
  const start = weekStart.value ? new Date(weekStart.value) : new Date();
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  const days = locale => locale === 'zh' ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return { date: d.toISOString().split('T')[0], label: `${d.getMonth() + 1}/${d.getDate()} ${days[i]}` };
  });
});

const employeeOptions = computed(() => employees.value.map(e => ({ label: e.name, value: e.id })));
const templateOptions = computed(() => templates.value.map(t => ({ label: t.name, value: t.id })));

const allSlots = computed(() => {
  const result = [];
  for (const d of weekDays.value) {
    for (const s of timeSlots) {
      const existing = shifts.value.filter(sh => sh.date === d.date && sh.start_time === s.start);
      if (existing.length === 0) {
        result.push({ _key: `${d.date}-${s.start}`, date: d.date, start_time: s.start, end_time: s.end, employee_id: null, employee_name: null });
      } else {
        existing.forEach(e => result.push({ ...e, _key: `${e.id || 'new'}-${d.date}-${s.start}` }));
      }
    }
  }
  return result;
});

function getShiftsFor(date, start, end) {
  return allSlots.value.filter(s => s.date === date && s.start_time === start);
}

function handleCellClick(date, start, end, shift) {
  assignSlot.value = { date, start_time: start, end_time: end, shift };
  assignEmployeeId.value = shift.employee_id;
  showAssign.value = true;
}

async function doAssign() {
  const s = assignSlot.value;
  if (s.shift.employee_id) {
    // Edit existing
    await shiftsAPI.update(s.shift.id, { employee_id: assignEmployeeId.value, start_time: s.shift.start_time, end_time: s.shift.end_time });
  } else if (assignEmployeeId.value) {
    // Create new
    await shiftsAPI.create({ employee_id: assignEmployeeId.value, date: s.date, start_time: s.start_time, end_time: s.end_time });
  }
  showAssign.value = false;
  fetchShifts();
}

async function saveAll() {
  saving.value = true;
  message.success('排班已保存');
  saving.value = false;
}

async function applyTemplate(tid) {
  if (!tid) return;
  try {
    const ws = weekDays.value[0].date;
    const res = await shiftsAPI.applyTemplate(tid, ws);
    message.success(`从模板生成了 ${res.data.created} 个班次`);
    fetchShifts();
  } catch (err) {
    message.error('模板应用失败');
  }
}

async function copyLastWeek() {
  const lastStart = new Date(weekDays.value[0].date);
  lastStart.setDate(lastStart.getDate() - 7);
  const lastEnd = new Date(lastStart); lastEnd.setDate(lastEnd.getDate() + 6);
  const lastShifts = (await shiftsAPI.list(lastStart.toISOString().split('T')[0], lastEnd.toISOString().split('T')[0])).data;
  const newStart = weekDays.value[0].date;
  for (const s of lastShifts) {
    const oldDate = new Date(s.date);
    const diff = Math.round((new Date(newStart) - new Date(lastStart.toISOString().split('T')[0])) / 86400000);
    const newDate = new Date(oldDate); newDate.setDate(newDate.getDate() + diff);
    await shiftsAPI.create({ employee_id: s.employee_id, date: newDate.toISOString().split('T')[0], start_time: s.start_time, end_time: s.end_time, break_minutes: s.break_minutes, area: s.area });
  }
  message.success('已复制上周排班');
  fetchShifts();
}

async function fetchShifts() {
  loading.value = true;
  try {
    const from = weekDays.value[0].date, to = weekDays.value[6].date;
    shifts.value = (await shiftsAPI.list(from, to)).data;
    // Join employee names
    for (const s of shifts.value) {
      const emp = employees.value.find(e => e.id === s.employee_id);
      s.employee_name = emp?.name || null;
    }
  } catch (err) { console.error(err); } finally { loading.value = false; }
}

onMounted(async () => {
  employees.value = (await employeesAPI.list()).data;
  templates.value = (await shiftsAPI.templates()).data;
  const today = new Date();
  today.setDate(today.getDate() - today.getDay() + 1);
  weekStart.value = new Date(today).getTime();
  fetchShifts();
});
</script>
