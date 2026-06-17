<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.approvals') }}</n-h2>
    <n-tabs v-model:value="tab">
      <!-- Tab 1: 换班 -->
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
              <span v-if="s.approver_name" style="font-size: 12px; color: var(--n-text-color-3)">{{ s.status === 'approved' ? t('approvals.approved_by', { name: s.approver_name }) : t('approvals.rejected_by', { name: s.approver_name }) }}</span>
            </div>
            <n-space>
              <n-space v-if="s.status === 'pending'">
                <n-button type="success" size="small" @click="approveSwap(s.id)">{{ t('approvals.approve') }}</n-button>
                <n-button type="error" size="small" @click="rejectSwap(s.id)">{{ t('approvals.reject') }}</n-button>
              </n-space>
              <n-button v-if="s.status !== 'pending'" size="tiny" @click="undoSwap(s.id)">↩ {{ t('approvals.undo') }}</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>

      <!-- Tab 2: 请假 -->
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
              <span v-if="l.approver_name" style="font-size: 12px; color: var(--n-text-color-3)">{{ l.status === 'approved' ? t('approvals.approved_by', { name: l.approver_name }) : t('approvals.rejected_by', { name: l.approver_name }) }}</span>
            </div>
            <n-space>
              <n-space v-if="l.status === 'pending'">
                <n-button type="success" size="small" @click="approveLeave(l.id)">{{ t('approvals.approve') }}</n-button>
                <n-button type="error" size="small" @click="rejectLeave(l.id)">{{ t('approvals.reject') }}</n-button>
              </n-space>
              <n-button v-if="l.status !== 'pending'" size="tiny" @click="undoLeave(l.id)">↩ {{ t('approvals.undo') }}</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>

      <!-- Tab 3: 审批记录 -->
      <n-tab-pane name="records" :tab="t('approvals.records_tab')">
        <n-empty v-if="records.length === 0" :description="t('approvals.no_records')" style="padding: 40px" />
        <n-card v-for="r in records" :key="r._type + '-' + r.id" size="small" style="margin-bottom: 8px">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <div>
              <n-tag size="small" style="margin-right: 8px">{{ r._type === 'swap' ? t('approvals.type_swap') : t('approvals.type_leave') }}</n-tag>
              <n-tag :type="statusColor(r.status)" size="small" style="margin-right: 8px">{{ statusLabel(r.status) }}</n-tag>
              <strong>{{ r.requester_name }}</strong>
              <span v-if="r._type === 'swap' && r.target_name"> → {{ r.target_name }}</span>
              <br />
              <span v-if="r._type === 'swap'" style="color: var(--n-text-color-3); font-size: 13px">{{ r.ref_date }} {{ r.start_time }}-{{ r.end_time }}</span>
              <span v-else style="color: var(--n-text-color-3); font-size: 13px">{{ r.start_date }} → {{ r.end_date }} ({{ r.type || 'unpaid' }})</span>
              <span v-if="r.reason" style="color: var(--n-text-color-3); font-size: 13px; margin-left: 8px">| {{ r.reason }}</span>
              <br />
              <span v-if="r.approver_name" style="font-size: 12px; color: var(--n-text-color-3)">{{ r.status === 'approved' ? t('approvals.approved_by', { name: r.approver_name }) : t('approvals.rejected_by', { name: r.approver_name }) }}</span>
            </div>
            <n-space>
              <n-button size="tiny" @click="openEdit(r)">✏️ {{ t('common.edit') }}</n-button>
              <n-button size="tiny" type="error" secondary @click="deleteRecord(r)">🗑️</n-button>
            </n-space>
          </div>
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEdit" preset="card" :title="t('approvals.edit_record')" style="width: 400px">
      <n-form v-if="editTarget" :model="editTarget" label-placement="left" label-width="80">
        <p style="font-size: 12px; color: var(--n-text-color-3)">{{ editTarget.requester_name }} · {{ editTarget._type === 'swap' ? t('approvals.type_swap') : t('approvals.type_leave') }}</p>
        <n-divider />
        <n-form-item :label="t('approvals.reason')">
          <n-input v-model:value="editTarget.reason" type="textarea" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="editTarget.status" :options="statusOptions" style="width: 150px" />
        </n-form-item>
        <n-space justify="end" style="margin-top: 16px">
          <n-button @click="showEdit = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="editSaving" @click="saveEdit">{{ t('common.save') }}</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { approvalsAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const tab = ref('swaps');
const swaps = ref([]);
const leaves = ref([]);
const records = ref([]);

// 编辑
const showEdit = ref(false);
const editTarget = ref(null);
const editSaving = ref(false);

const statusOptions = computed(() => [
  { label: t('approvals.pending'), value: 'pending' },
  { label: t('approvals.approved'), value: 'approved' },
  { label: t('approvals.rejected'), value: 'rejected' },
]);

function statusColor(s) { return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'error'; }
function statusLabel(s) { return s === 'pending' ? t('approvals.pending') : s === 'approved' ? t('approvals.approved') : t('approvals.rejected'); }

async function fetchData() {
  try { swaps.value = (await approvalsAPI.swaps()).data; } catch (e) { console.error(e); }
  try { leaves.value = (await approvalsAPI.leaves()).data; } catch (e) { console.error(e); }
  try { records.value = (await approvalsAPI.all()).data; } catch (e) { console.error(e); }
}

function openEdit(r) {
  editTarget.value = { ...r };
  showEdit.value = true;
}

async function saveEdit() {
  editSaving.value = true;
  try {
    const data = { status: editTarget.value.status, reason: editTarget.value.reason };
    if (editTarget.value._type === 'swap') {
      await approvalsAPI.updateSwap(editTarget.value.id, data);
    } else {
      await approvalsAPI.updateLeave(editTarget.value.id, data);
    }
    message.success(t('common.save_success'));
    showEdit.value = false;
    fetchData();
  } catch (err) {
    message.error(err.response?.data?.error || t('common.save_failed'));
  } finally {
    editSaving.value = false;
  }
}

async function approveSwap(id) { await approvalsAPI.approveSwap(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectSwap(id) { await approvalsAPI.rejectSwap(id); message.info(t('approvals.rejected')); fetchData(); }
async function approveLeave(id) { await approvalsAPI.approveLeave(id); message.success(t('approvals.approved')); fetchData(); }
async function rejectLeave(id) { await approvalsAPI.rejectLeave(id); message.info(t('approvals.rejected')); fetchData(); }

async function deleteRecord(r) {
  const confirmed = window.confirm(t('common.delete') + '?');
  if (!confirmed) return;
  try {
    if (r._type === 'swap') await approvalsAPI.deleteSwap(r.id);
    else await approvalsAPI.deleteLeave(r.id);
    message.success(t('common.delete_success'));
    fetchData();
  } catch (err) {
    message.error(err.response?.data?.error || t('common.delete_failed'));
  }
}

async function undoSwap(id) { await approvalsAPI.undoSwap(id); message.success(t('approvals.undo_success')); fetchData(); }
async function undoLeave(id) { await approvalsAPI.undoLeave(id); message.success(t('approvals.undo_success')); fetchData(); }

onMounted(fetchData);
</script>
