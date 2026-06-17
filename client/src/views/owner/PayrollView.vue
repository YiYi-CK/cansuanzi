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
            <n-data-table v-else :columns="unpaidColumns" :data="unpaid.employees" :bordered="false" :single-line="false" />
            <n-divider v-if="unpaid.employees.length > 0" />
            <p v-if="unpaid.employees.length > 0" style="font-size: 13px; color: var(--n-text-color-3)">
              {{ t('payroll.total') }}: {{ Number(unpaid.total_hours).toFixed(1) }}h — ${{ Number(unpaid.total_wage).toFixed(2) }}
            </p>
          </n-spin>
        </n-space>
      </n-tab-pane>
    </n-tabs>

    <!-- 支付弹窗 -->
    <n-modal v-model:show="showPayModal" preset="card" :title="t('payroll.pay_confirm')" style="width: 420px">
      <div v-if="payTarget">
        <p><strong>{{ payTarget.name }}</strong></p>
        <p>{{ t('payroll.payable_amount') }}: <strong style="font-size: 18px; color: #EA580C">${{ payRemaining.toFixed(2) }}</strong></p>
        <p style="font-size: 12px; color: var(--n-text-color-3)">{{ payPeriodStr }}</p>
        <n-divider />

        <!-- 现金 -->
        <n-form-item :label="t('payroll.cash')">
          <n-space>
            <n-checkbox v-model:checked="payCash" />
            <n-input-number v-model:value="payCashAmount" :min="0" :step="0.01" :precision="2" :disabled="!payCash" style="width: 160px" />
          </n-space>
        </n-form-item>
        <!-- 转账 -->
        <n-form-item :label="t('payroll.transfer')">
          <n-space>
            <n-checkbox v-model:checked="payTransfer" />
            <n-input-number v-model:value="payTransferAmount" :min="0" :step="0.01" :precision="2" :disabled="!payTransfer" style="width: 160px" />
          </n-space>
        </n-form-item>

        <p style="font-size: 13px; color: var(--n-text-color-3)">
          {{ t('payroll.total') }}: ${{ totalPayAmount.toFixed(2) }}
        </p>

        <n-space justify="end" style="margin-top: 16px">
          <n-button @click="showPayModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="paying" :disabled="totalPayAmount <= 0" @click="confirmPay">{{ t('payroll.pay') }}</n-button>
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

// Tab 1
const loading = ref(false);
const dateRange = ref(null);
const payroll = ref({ employees: [], total_hours: 0, total_wage: 0 });

// Tab 2
const unpaidLoading = ref(false);
const unpaidDateRange = ref(null);
const unpaid = ref({ employees: [], total_hours: 0, total_wage: 0 });

// 支付弹窗
const showPayModal = ref(false);
const payTarget = ref(null);
const payCash = ref(true);
const payCashAmount = ref(0);
const payTransfer = ref(false);
const payTransferAmount = ref(0);
const paying = ref(false);
const payPeriodStr = ref('');

function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.getTime(), sun.getTime()];
}

const totalPayAmount = computed(() => {
  let t = 0;
  if (payCash.value) t += Number(payCashAmount.value) || 0;
  if (payTransfer.value) t += Number(payTransferAmount.value) || 0;
  return t;
});

const payRemaining = computed(() => {
  if (!payTarget.value) return 0;
  return Math.max(0, payTarget.value.estimated_wage - (payTarget.value.paid_amount || 0));
});

// 支付状态颜色映射
function statusType(s) {
  return s === 'paid' ? 'success' : s === 'partially_paid' ? 'warning' : s === 'prepaid' ? 'info' : 'default';
}

const overviewColumns = computed(() => [
  { title: t('payroll.name'), key: 'name' },
  { title: t('payroll.total_hours'), key: 'total_hours' },
  { title: t('payroll.weekday_hours'), key: 'weekday_hours' },
  { title: t('payroll.weekend_hours'), key: 'saturday_hours' },
  { title: t('payroll.holiday_hours'), key: 'holiday_hours' },
  { title: t('payroll.estimated_wage'), key: 'estimated_wage', render: (row) => '$' + Number(row.estimated_wage).toFixed(2) },
  { title: t('payroll.paid_wage'), key: 'paid_amount', render: (row) => '$' + Number(row.paid_amount || 0).toFixed(2) },
  { title: t('payroll.payment_status'), key: 'payment_status', render: (row) => {
    let label = row.payment_status;
    if (label === 'paid') label = t('payroll.paid');
    else if (label === 'unpaid') label = t('payroll.unpaid');
    else if (label === 'partially_paid') label = t('payroll.partially_paid');
    else if (label === 'prepaid') label = t('payroll.prepaid');
    return h(NTag, { type: statusType(row.payment_status), size: 'small' }, { default: () => label });
  }},
  { title: '', key: 'actions', render: (row) =>
    ['unpaid', 'partially_paid'].includes(row.payment_status) ? h(NButton, { size: 'small', type: 'primary', onClick: () => openPay(row) }, { default: () => t('payroll.pay') }) : null,
  },
]);

const unpaidColumns = computed(() => [
  { title: t('payroll.name'), key: 'name' },
  { title: t('payroll.total_hours'), key: 'total_hours' },
  { title: t('payroll.estimated_wage'), key: 'estimated_wage', render: (row) => '$' + Number(row.estimated_wage).toFixed(2) },
  { title: t('payroll.paid_wage'), key: 'paid_amount', render: (row) => '$' + Number(row.paid_amount || 0).toFixed(2) },
  { title: t('payroll.payment_status'), key: 'payment_status', render: (row) => {
    if (!row.paid_amount || row.paid_amount <= 0) return h(NTag, { type: 'default', size: 'small' }, { default: () => t('payroll.unpaid') });
    return h(NTag, { type: 'warning', size: 'small' }, { default: () => t('payroll.partially_paid') });
  }},
  { title: '', key: 'actions', render: (row) =>
    h(NButton, { size: 'small', type: 'primary', onClick: () => {
      const [from, to] = unpaidDateRange.value || getThisWeek();
      payPeriodStr.value = new Date(from).toISOString().split('T')[0] + ' ~ ' + new Date(to).toISOString().split('T')[0];
      payTarget.value = row;
      payCash.value = true;
      payCashAmount.value = row.remaining || row.estimated_wage;
      payTransfer.value = false;
      payTransferAmount.value = 0;
      showPayModal.value = true;
    }}, { default: () => t('payroll.pay') }),
  },
]);

async function fetchOverview() {
  loading.value = true;
  try {
    const [from, to] = dateRange.value || getThisWeek();
    payroll.value = (await payrollAPI.get(
      new Date(from).toISOString().split('T')[0],
      new Date(to).toISOString().split('T')[0],
    )).data;
  } catch (err) { console.error(err); } finally { loading.value = false; }
}

async function fetchUnpaid() {
  unpaidLoading.value = true;
  try {
    const [from, to] = unpaidDateRange.value || getThisWeek();
    unpaid.value = (await payrollAPI.unpaid(
      new Date(from).toISOString().split('T')[0],
      new Date(to).toISOString().split('T')[0],
    )).data;
  } catch (err) { console.error(err); } finally { unpaidLoading.value = false; }
}

function openPay(row) {
  const [from, to] = dateRange.value || getThisWeek();
  payPeriodStr.value = new Date(from).toISOString().split('T')[0] + ' ~ ' + new Date(to).toISOString().split('T')[0];
  payTarget.value = row;
  payCash.value = true;
  const remaining = row.estimated_wage - (row.paid_amount || 0);
  payCashAmount.value = remaining > 0 ? remaining : row.estimated_wage;
  payTransfer.value = false;
  payTransferAmount.value = 0;
  showPayModal.value = true;
}

async function confirmPay() {
  paying.value = true;
  try {
    const [from, to] = dateRange.value || getThisWeek();
    const payItems = [];
    if (payCash.value && payCashAmount.value > 0) payItems.push({ method: 'cash', amount: payCashAmount.value });
    if (payTransfer.value && payTransferAmount.value > 0) payItems.push({ method: 'transfer', amount: payTransferAmount.value });

    await payrollAPI.pay({
      employee_id: payTarget.value.employee_id,
      period_start: new Date(from).toISOString().split('T')[0],
      period_end: new Date(to).toISOString().split('T')[0],
      payments: payItems,
    });
    message.success(t('payroll.pay_success'));
    showPayModal.value = false;
    fetchOverview();
    fetchUnpaid();
  } catch (err) {
    message.error(err.response?.data?.error || t('payroll.pay_failed'));
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
