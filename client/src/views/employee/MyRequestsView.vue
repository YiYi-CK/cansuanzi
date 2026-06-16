<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.my_requests') }}</n-h2>
    <n-space style="margin-bottom: 16px">
      <n-button @click="showSwap = true">{{ t('approvals.request_swap') }}</n-button>
      <n-button @click="showLeave = true">{{ t('approvals.request_leave') }}</n-button>
    </n-space>

    <n-empty v-if="swaps.length + leaves.length === 0" :description="t('approvals.no_pending')" style="padding: 40px" />

    <n-list v-if="swaps.length > 0">
      <n-list-item v-for="s in swaps" :key="s.id">
        <n-tag :type="statusColor(s.status)">{{ s.status }}</n-tag>
        {{ s.date }} {{ s.start_time }}-{{ s.end_time }}
        <span v-if="s.target_name" style="margin-left: 8px">→ {{ s.target_name }}</span>
      </n-list-item>
    </n-list>

    <n-modal v-model:show="showSwap" :title="t('approvals.request_swap')" style="width: 400px">
      <n-form :model="swapForm">
        <n-form-item label="班次">
          <n-select v-model:value="swapForm.shift_id" :options="shiftOptions" />
        </n-form-item>
        <n-form-item :label="t('approvals.reason')">
          <n-input v-model:value="swapForm.reason" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showSwap = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="submitSwap">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="showLeave" :title="t('approvals.request_leave')" style="width: 400px">
      <n-form :model="leaveForm">
        <n-form-item label="日期">
          <n-date-picker v-model:value="leaveForm.dates" type="daterange" />
        </n-form-item>
        <n-form-item :label="t('approvals.reason')">
          <n-input v-model:value="leaveForm.reason" type="textarea" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showLeave = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" @click="submitLeave">{{ t('common.confirm') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { approvalsAPI, shiftsAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const swaps = ref([]);
const leaves = ref([]);
const showSwap = ref(false);
const showLeave = ref(false);
const shifts = ref([]);
const swapForm = ref({ shift_id: null, reason: '' });
const leaveForm = ref({ dates: null, reason: '' });

const shiftOptions = computed(() => shifts.value.map(s => ({
  label: `${s.date} ${s.start_time}-${s.end_time}`,
  value: s.id,
})));

function statusColor(s) {
  return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'error';
}

async function fetchData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    shifts.value = (await shiftsAPI.list(today, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])).data;
    const swapsRes = await approvalsAPI.swaps();
    const leavesRes = await approvalsAPI.leaves();
    swaps.value = swapsRes.data;
    leaves.value = leavesRes.data;
  } catch (err) { console.error(err); }
}

async function submitSwap() {
  try {
    await approvalsAPI.createSwap(swapForm.value);
    message.success('换班请求已提交');
    showSwap.value = false;
    fetchData();
  } catch (err) { message.error('提交失败'); }
}

async function submitLeave() {
  try {
    const [start, end] = leaveForm.value.dates || [];
    await approvalsAPI.createLeave({
      start_date: new Date(start).toISOString().split('T')[0],
      end_date: new Date(end).toISOString().split('T')[0],
      reason: leaveForm.value.reason,
      type: 'unpaid',
    });
    message.success('请假请求已提交');
    showLeave.value = false;
    fetchData();
  } catch (err) { message.error('提交失败'); }
}

onMounted(fetchData);
</script>

<script>
import { computed } from 'vue';
</script>
