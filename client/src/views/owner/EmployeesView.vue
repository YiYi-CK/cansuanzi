<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.employees') }}</n-h2>
    <n-space justify="space-between" style="margin-bottom: 16px">
      <n-input-group>
        <n-input v-model:value="search" :placeholder="t('common.search')" clearable style="width: 200px" />
      </n-input-group>
      <n-button type="primary" @click="openNewEmployee">{{ t('employee.add_employee') }}</n-button>
    </n-space>

    <n-spin :show="loading">
      <n-data-table :columns="columns" :data="filteredEmployees" :bordered="false" :single-line="false" />
    </n-spin>

    <!-- 新增/编辑弹窗 -->
    <n-modal preset="card" v-model:show="showAdd" :title="editing ? t('employee.edit_employee') : t('employee.add_employee')" style="width: 500px">
      <n-form :model="form" label-placement="left" label-width="100">
        <n-form-item :label="t('employee.name')"><n-input v-model:value="form.name" /></n-form-item>
        <n-form-item :label="t('employee.email')"><n-input v-model:value="form.email" /></n-form-item>
        <n-form-item :label="t('employee.phone')"><n-input v-model:value="form.phone" /></n-form-item>
        <n-form-item :label="t('employee.type')">
          <n-select v-model:value="form.employment_type" :options="typeOptions" />
        </n-form-item>
        <n-form-item :label="t('employee.hourly_rate')">
          <n-input-number v-model:value="form.base_hourly_rate" :min="0" :step="1" />
        </n-form-item>
        <n-form-item label="职位">
          <n-select v-model:value="form.position" :options="positionOptions" placeholder="选择职位" filterable tag />
        </n-form-item>
        <n-form-item label="可做工位">
          <n-checkbox-group v-model:value="form.station_ids">
            <n-space><n-checkbox v-for="s in stationList" :key="s" :value="s" :label="s" /></n-space>
          </n-checkbox-group>
        </n-form-item>
        <n-form-item v-if="!editing" :label="t('auth.password')"><n-input v-model:value="form.password" type="password" /></n-form-item>
        <n-form-item v-if="editing" label="新密码">
          <n-space>
            <n-input v-model:value="form.password" type="password" placeholder="留空不修改" style="width: 180px" />
            <n-button size="small" @click="form.password = genPassword(); generateTip = true">生成随机密码</n-button>
          </n-space>
          <div v-if="generateTip" style="font-size:12px;color:#EA580C;margin-top:4px">新密码: {{ form.password }}</div>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAdd = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="saving" @click="saveEmployee">{{ t('common.save') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage, NButton, NTag } from 'naive-ui';
import { employeesAPI } from '../../api/endpoints';
import { settingsAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const showAdd = ref(false);
const editing = ref(null);
const generateTip = ref(false);
const employees = ref([]);

const form = ref({ name: '', email: '', phone: '', employment_type: 'casual', base_hourly_rate: 0, position: '', station_ids: [], password: '' });

const stationList = ref(['前台','厨房','大厅']);
const typeOptions = [
  { label: t('employee.full_time'), value: 'full_time' },
  { label: t('employee.part_time'), value: 'part_time' },
  { label: t('employee.casual'), value: 'casual' },
];

const positionOptions = [
  { label: '厨师', value: '厨师' },
  { label: '服务员', value: '服务员' },
  { label: '收银', value: '收银' },
  { label: '洗碗工', value: '洗碗工' },
  { label: '前台', value: '前台' },
  { label: '经理', value: '经理' },
  { label: '老板', value: '老板' },

function genPassword() { return Math.random().toString(36).slice(2, 10); }
];

function parseStations(raw) { try { return typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); } catch { return []; } }

const filteredEmployees = computed(() => {
  if (!search.value) return employees.value;
  return employees.value.filter(e => e.name.toLowerCase().includes(search.value.toLowerCase()));
});

const columns = computed(() => [
  { title: t('employee.name'), key: 'name' },
  { title: '职位', key: 'position' },
  { title: t('employee.email'), key: 'email' },
  { title: t('employee.type'), key: 'employment_type', render: (row) => t(`employee.${row.employment_type}`) },
  { title: t('employee.hourly_rate'), key: 'base_hourly_rate', render: (row) => '$' + parseFloat(row.base_hourly_rate).toFixed(2) },
  { title: t('employee.status'), key: 'active', render: (row) => h(NTag, { type: row.active ? 'success' : 'error' }, { default: () => row.active ? t('employee.active') : t('employee.inactive') }) },
  { title: '', key: 'actions', render: (row) => h(NButton, { size: 'small', onClick: () => editEmployee(row) }, { default: () => t('common.edit') }) },
]);

async function fetchEmployees() {
  loading.value = true;
  try { employees.value = (await employeesAPI.list()).data; } catch (err) { message.error('加载失败'); } finally { loading.value = false; }
}


function openNewEmployee() {
  editing.value = null;
  generateTip.value = false;
  form.value = { name: "", email: "", phone: "", position: "", station_ids: [], employment_type: "casual", base_hourly_rate: 0, password: "" };
  showAdd.value = true;
}
function editEmployee(emp) {
  editing.value = emp;
  generateTip.value = false;
  form.value = { name: emp.name, email: emp.email, phone: emp.phone || '', position: emp.position || '', station_ids: parseStations(emp.station_ids), employment_type: emp.employment_type, base_hourly_rate: parseFloat(emp.base_hourly_rate), password: '' };
  showAdd.value = true;
}

async function saveEmployee() {
  saving.value = true;
  try {
    if (editing.value) {
      await employeesAPI.update(editing.value.id, form.value);
      message.success('已更新');
    } else {
      await employeesAPI.create(form.value);
      message.success('已添加');
    }
    showAdd.value = false;
    editing.value = null;
    form.value = { name: '', email: '', phone: '', position: '', station_ids: [], employment_type: 'casual', base_hourly_rate: 0, password: '' };
    fetchEmployees();
  } catch (err) {
    message.error(err.response?.data?.error || '保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  fetchEmployees();
  try { const s = (await settingsAPI.get()).data; if (s.stations) stationList.value = s.stations; } catch (e) { console.error(e); }
});
</script>
