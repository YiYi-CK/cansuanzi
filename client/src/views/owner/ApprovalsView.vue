<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.approvals') }}</n-h2>
    <n-tabs v-model:value="tab">
      <n-tab-pane name="swaps" :tab="t('approvals.shift_swap')">
        <n-empty v-if="swaps.filter(s => s.status === 'pending').length === 0" :description="t('approvals.no_pending')" style="padding: 40px" />
        <n-card v-for="s in swaps" :key="s.id" v-show="s.status === 'pending'" size="small" style="margin-bottom: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <strong>{{ s.requester_name }}</strong>
              <span v-if="s.target_name"> → {{ s.target_name }}</span>
              <br />
              <span style="color: var(--n-text-color-3); font-size: 13px">{{ s.date }} {{ s.start_time }}-{{ s.end_time }}</span>
              <span v-if="s.reason" style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px"> | {{ s.reason }}</span>
            </div>
            <n-space>
              <n-button type="success" size="small" @click="approveSwap(s.id)">{{ t('approvals.approve') }}</n-button>
              <n-button type="error" size="small" @click="rejectSwap(s.id)">{{ t('approvals.reject') }}</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>
      <n-tab-pane name="leaves" :tab="t('approvals.leave')">
        <n-empty v-if="leaves.filter(l => l.status === 'pending').length === 0" :description="t('approvals.no_pending')" style="padding: 40px" />
        <n-card v-for="l in leaves" :key="l.id" v-show="l.status === 'pending'" size="small" style="margin-bottom: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <strong>{{ l.employee_name }}</strong>
              <span style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px">
                {{ l.start_date }} → {{ l.end_date }} ({{ l.type }})
              </span>
              <span v-if="l.reason" style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px"> | {{ l.reason }}</span>
            </div>
            <n-space>
              <n-button type="success" size="small" @click="approveLeave(l.id)">{{ t('approvals.approve') }}</n-button>
              <n-button type="error" size="small" @click="rejectLeave(l.id)">{{ t('approvals.reject') }}</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { approvalsAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const tab = ref('swaps');
const swaps = ref([]);
const leaves = ref([]);

async function fetchData() {
  swaps.value = (await approvalsAPI.swaps()).data;
  leaves.value = (await approvalsAPI.leaves()).data;
}

async function approveSwap(id) { await approvalsAPI.approveSwap(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectSwap(id) { await approvalsAPI.rejectSwap(id); message.info(t('approvals.rejected')); fetchData(); }
async function approveLeave(id) { await approvalsAPI.approveLeave(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectLeave(id) { await approvalsAPI.rejectLeave(id); message.info(t('approvals.rejected')); fetchData(); }

onMounted(fetchData);
</script>
