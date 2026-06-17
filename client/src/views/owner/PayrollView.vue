<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('payroll.title') }}</n-h2>
    <n-tabs v-model:value="activeTab">
      <!-- Tab 1: 工资概览 -->
      <n-tab-pane name="overview" :tab="t('payroll.overview_tab')">
        <n-space vertical>
          <n-date-picker v-model:value="dateRange" type="daterange" @update:value="fetchOverview" />
          <n-spin :show="loading">
            <n-data-table :columns="overviewColumns" :data="payroll.employees" :bordered="false" :single-line="false" />
            <n-divider />
            <p style="font-size: 13px; color: var(--n-text-color-3)">
              {{ t('payroll.total') }}: {{ Number(payroll.total_hours).toFixed(1) }}h — ${{ Number(payroll.total_wage).toFixed(2) }}
              <br />{{ t('payroll.loading_hint') }}
            </p>
          </n-spin>
        </n-space>
      </n-tab-pane>

      <!-- Tab 2: 应付工资 -->
      <n-tab-pane name="unpaid" :tab="t('payroll.unpaid_tab')">
        <n-space vertical>
          <n-date-picker v-model:value="unpaidDateRange" type="daterange" @update:value="fetchUnpaid" />
          <n-spin :show="unpaidLoading">
            <n-empty v-if="unpaid.employees.length === 0" :description="t('payroll.no_unpaid')" style="padding: 40px" />
            <template v-else>
              <n-data-table :columns="unpaidColumns" :data="unpaid.employees" :bordered="false" :single-line="false" />
              <n-divider />
              <p style="font-size: 13px; color: var(--n-text-color-3)">
                {{ t('payroll.total') }}: {{ Number(unpaid.total_hours).toFixed(1) }}h — ${{ Number(unpaid.total_wage).toFixed(2) }}
              </p>
            </template>
          </n-spin>
        </n-space>
      </n-tab-pane>
    </n-tabs>

    <!-- 支付弹窗 -->
    <n-modal v-model:show="showPayModal" preset="card" :title="t('payroll.pay_confirm')" style="width: 400px">
      <div v-if="payTarget">
        <p><strong>{{ payTarget.name }}</strong></p>
        <p>{{ t('payroll.estimated_wage') }}: <strong style="font-size: 18px; color: #EA580C">${{ Number(payTarget.estimated_wage).toFixed(2) }}</strong></p>
        <p style="font-size: 12px; color: var(--n-text-color-3)">{{ payPeriodStr }}</p>
        <n-divider />
        <n-form-item :label="t('payroll.pay_confirm')">
          <n-radio-group v-model:value="payMethod">
            <n-space>
              <n-radio value="cash">{{ t('payroll.cash') }}</n-radio>
              <n-radio value="transfer">{{ t('payroll.transfer') }}</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-space justify="end" style="margin-top: 16px">
          <n-button @click="showPayModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="paying" @click="confirmPay">{{ t('payroll.pay') }}</n-button>
        </n-space>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage, NButton, NTag } from 'naive-ui';
import { payrollAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();

// Tab
const activeTab = ref('overview');

// Tab 1: 概览
const loading = ref(false);
const dateRange = ref(null);
const payroll = ref({ employees: [], total_hours: 0, total_wage: 0 });

// Tab 2: 应付
const unpaidLoading = ref(false);
const unpaidDateRange = ref(null);
const unpaid = ref({ employees: [], total_hours: 0, total_wage: 0 });

// 支付弹窗
const showPayModal = ref(false);
const payTarget = ref(null);
const payMethod = ref('cash');
const paying = ref(false);
const payPeriodStr = ref('');

/** 获取本周的周一和周日 */
function getThisWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // 到周一的天数差
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.getTime(), sun.getTime()];
}

// 概览列
const overviewColumns = computed(() => [
  { title: t('payroll.name'), key: 'name' },
  { title: t('payroll.total_hours'), key: 'total_hours' },
  { title: t('payroll.weekday_hours'), key: 'weekday_hours' },
  { title: t('payroll.weekend_hours'), key: 'saturday_hours' },
  { title: t('payroll.holiday_hours'), key: 'holiday_hours' },
  { title: t('payroll.estimated_wage'), key: 'estimated_wage', render: (row) => '$' + Number(row.estimated_wage).toFixed(2) },
  { title: t('payroll.payment_status'), key: 'payment_status', render: (row) =>
    h(NTag, { type: row.payment_status === 'paid' ? 'success' : 'warning', size: 'small' }, {
      default: () => row.payment_status === 'paid' ? t('payroll.paid') : t('payroll.unpaid'),
    }),
  },
  { title: '', key: 'actions', render: (row) =>
    row.payment_status !== 'paid' ? h(NButton, { size: 'small', type: 'primary', onClick: () => openPay(row) }, { default: () => t('payroll.pay') }) : null,
  },
]);

// 应付列
const unpaidColumns = computed(() => [
  { title: t('payroll.name'), key: 'name' },
  { title: t('payroll.total_hours'), key: 'total_hours' },
  { title: t('payroll.weekday_hours'), key: 'weekday_hours' },
  { title: t('payroll.weekend_hours'), key: 'saturday_hours' },
  { title: t('payroll.holiday_hours'), key: 'holiday_hours' },
  { title: t('payroll.estimated_wage'), key: 'estimated_wage', render: (row) => '$' + Number(row.estimated_wage).toFixed(2) },
  { title: '', key: 'actions', render: (row) =>
    h(NButton, { size: 'small', type: 'primary', onClick: () => {
      const [from, to] = unpaidDateRange.value || getThisWeek();
      payPeriodStr.value = new Date(from).toISOString().split('T')[0] + ' ~ ' + new Date(to).toISOString().split('T')[0];
      payTarget.value = row;
      payMethod.value = 'cash';
      showPayModal.value = true;
    }}, { default: () => t('payroll.pay') }),
  },
]);

async function fetchOverview() {
  loading.value = true;
  try {
    const [from, to] = dateRange.value || getThisWeek();
    const dateFrom = new Date(from).toISOString().split('T')[0];
    const dateTo = new Date(to).toISOString().split('T')[0];
    payroll.value = (await payrollAPI.get(dateFrom, dateTo)).data;
  } catch (err) { console.error(err); } finally { loading.value = false; }
}

async function fetchUnpaid() {
  unpaidLoading.value = true;
  try {
    const [from, to] = unpaidDateRange.value || getThisWeek();
    const dateFrom = new Date(from).toISOString().split('T')[0];
    const dateTo = new Date(to).toISOString().split('T')[0];
    unpaid.value = (await payrollAPI.unpaid(dateFrom, dateTo)).data;
  } catch (err) { console.error(err); } finally { unpaidLoading.value = false; }
}

function openPay(row) {
  const [from, to] = dateRange.value || getThisWeek();
  payPeriodStr.value = new Date(from).toISOString().split('T')[0] + ' ~ ' + new Date(to).toISOString().split('T')[0];
  payTarget.value = row;
  payMethod.value = 'cash';
  showPayModal.value = true;
}

async function confirmPay() {
  paying.value = true;
  try {
    const [from, to] = dateRange.value || getThisWeek();
    await payrollAPI.pay({
      employee_id: payTarget.value.employee_id,
      period_start: new Date(from).toISOString().split('T')[0],
      period_end: new Date(to).toISOString().split('T')[0],
      amount: payTarget.value.estimated_wage,
      method: payMethod.value,
    });
    message.success(t('payroll.pay_success'));
    showPayModal.value = false;
    fetchOverview();
    fetchUnpaid();
  } catch (err) {
    const msg = err.response?.data?.error;
    message.error(msg === '该周期已支付' ? t('payroll.already_paid') : (msg || t('payroll.pay_failed')));
  } finally {
    paying.value = false;
  }
}

onMounted(() => {
  const week = getThisWeek();
  dateRange.value = week;
  unpaidDateRange.value = week;
  fetchOverview();
  fetchUnpaid();
});
</script>
