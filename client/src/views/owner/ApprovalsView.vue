<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.approvals') }}</n-h2>
    <n-tabs v-model:value="tab">
      <n-tab-pane name="swaps" :tab="t('approvals.shift_swap')">
        <n-empty v-if="swaps.length === 0" :description="t('approvals.no_pending')" style="padding: 40px" />
        <n-card v-for="s in swaps" :key="s.id" size="small" style="margin-bottom: 8px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <n-tag :type="statusColor(s.status)" size="small" style="margin-right: 8px">{{ statusLabel(s.status) }}</n-tag>
              <strong>{{ s.requester_name }}</strong>
              <span v-if="s.target_name"> → {{ s.target_name }}</span>
              <br />
              <span style="color: var(--n-text-color-3); font-size: 13px">{{ s.date }} {{ s.start_time }}-{{ s.end_time }}</span>
              <span v-if="s.reason" style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px">| {{ s.reason }}</span>
              <br />
              <span v-if="s.approver_name" style="font-size: 12px; color: var(--n-text-color-3)">{{ s.status === 'approved' ? '✅' : '❌' }} {{ s.approver_name }} 审批</span>
            </div>
            <n-space>
              <n-space v-if="s.status === 'pending'">
                <n-button type="success" size="small" @click="approveSwap(s.id)">{{ t('approvals.approve') }}</n-button>
                <n-button type="error" size="small" @click="rejectSwap(s.id)">{{ t('approvals.reject') }}</n-button>
              </n-space>
              <n-button v-if="s.status !== 'pending'" size="tiny" @click="undoSwap(s.id)">↩ 撤回</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="leaves" :tab="t('approvals.leave')">
        <n-empty v-if="leaves.length === 0" :description="t('approvals.no_pending')" style="padding: 40px" />
        <n-card v-for="l in leaves" :key="l.id" size="small" style="margin-bottom: 8px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <n-tag :type="statusColor(l.status)" size="small" style="margin-right: 8px">{{ statusLabel(l.status) }}</n-tag>
              <strong>{{ l.employee_name }}</strong>
              <span style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px">
                {{ l.start_date }} → {{ l.end_date }} ({{ l.type }})
              </span>
              <span v-if="l.reason" style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px">| {{ l.reason }}</span>
              <br />
              <span v-if="l.approver_name" style="font-size: 12px; color: var(--n-text-color-3)">{{ l.status === 'approved' ? '✅' : '❌' }} {{ l.approver_name }} 审批</span>
            </div>
            <n-space>
              <n-space v-if="l.status === 'pending'">
                <n-button type="success" size="small" @click="approveLeave(l.id)">{{ t('approvals.approve') }}</n-button>
                <n-button type="error" size="small" @click="rejectLeave(l.id)">{{ t('approvals.reject') }}</n-button>
              </n-space>
              <n-button v-if="l.status !== 'pending'" size="tiny" @click="undoLeave(l.id)">↩ 撤回</n-button>
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

function statusColor(s) { return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'error'; }
function statusLabel(s) { return s === 'pending' ? t('approvals.pending') : s === 'approved' ? t('approvals.approved') : t('approvals.rejected'); }

async function fetchData() {
  try { swaps.value = (await approvalsAPI.swaps()).data; } catch (e) { console.error(e); }
  try { leaves.value = (await approvalsAPI.leaves()).data; } catch (e) { console.error(e); }
}

async function approveSwap(id) { await approvalsAPI.approveSwap(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectSwap(id) { await approvalsAPI.rejectSwap(id); message.info(t('approvals.rejected')); fetchData(); }
async function approveLeave(id) { await approvalsAPI.approveLeave(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectLeave(id) { await approvalsAPI.rejectLeave(id); message.info(t('approvals.rejected')); fetchData(); }

async function undoSwap(id) { await approvalsAPI.undoSwap(id); message.success('已撤回'); fetchData(); }

async function undoLeave(id) { await approvalsAPI.undoLeave(id); message.success('已撤回'); fetchData(); }

onMounted(fetchData);
</script>
