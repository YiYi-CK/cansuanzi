<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('payroll.title') }}</n-h2>
    <n-date-picker v-model:value="dateRange" type="daterange" style="margin-bottom: 20px" @update:value="fetchData" />
    <n-spin :show="loading">
      <n-data-table :columns="columns" :data="payroll.employees" :bordered="false" />
      <n-divider />
      <p style="font-size: 13px; color: var(--n-text-color-3)">
        {{ t('payroll.total') }}: {{ payroll.total_hours }}h — ${{ payroll.total_wage }}
        <br />{{ t('payroll.loading_hint') }}
      </p>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { payrollAPI } from '../../api/endpoints';

const { t } = useI18n();
const loading = ref(false);
const dateRange = ref(null);

const payroll = ref({ employees: [], total_hours: 0, total_wage: 0 });

const columns = computed(() => [
  { title: t('payroll.name'), key: 'name' },
  { title: t('payroll.total_hours'), key: 'total_hours' },
  { title: t('payroll.weekday_hours'), key: 'weekday_hours' },
  { title: t('payroll.weekend_hours'), key: 'saturday_hours' },
  { title: t('payroll.holiday_hours'), key: 'holiday_hours' },
  { title: t('payroll.estimated_wage'), key: 'estimated_wage', render: (row) => '$' + row.estimated_wage.toFixed(2) },
]);

async function fetchData() {
  loading.value = true;
  try {
    const today = new Date().toISOString().split('T')[0];
    const from = dateRange.value?.[0] ? new Date(dateRange.value[0]).toISOString().split('T')[0] : today;
    const to = dateRange.value?.[1] ? new Date(dateRange.value[1]).toISOString().split('T')[0] : today;
    payroll.value = (await payrollAPI.get(from, to)).data;
  } catch (err) { console.error(err); } finally { loading.value = false; }
}

onMounted(fetchData);
</script>
