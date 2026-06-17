<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('report.import_daily') }}</n-h2>
    <n-tabs v-model:value="activeTab">
      <!-- Tab 1: 手工录入 -->
      <n-tab-pane name="manual" :tab="t('report.manual_entry')">
        <n-form :model="form" label-placement="left" label-width="80" style="max-width: 400px">
          <n-form-item :label="t('report.date')"><n-date-picker v-model:value="form.date" type="date" /></n-form-item>
          <n-form-item :label="t('report.total_revenue')"><n-input-number v-model:value="form.total_revenue" :min="0" :step="0.01" :precision="2" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.cash')"><n-input-number v-model:value="form.total_cash" :min="0" :step="0.01" :precision="2" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.card')"><n-input-number v-model:value="form.total_card" :min="0" :step="0.01" :precision="2" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.difference')">
            <span :style="{ color: diffColor, fontWeight: 'bold', fontSize: '16px' }">{{ diffStr }}</span>
          </n-form-item>
          <n-form-item :label="t('report.notes')"><n-input v-model:value="form.notes" type="textarea" /></n-form-item>

          <n-divider>{{ t('report.expenses') }}</n-divider>
          <n-form-item v-for="(exp, i) in form.expenses" :key="i" :label="t('report.expenses')">
            <n-space>
              <n-select v-model:value="exp.category" :options="expenseCategoryOptions" style="width: 110px" size="small" />
              <n-input v-if="exp.category === 'other'" v-model:value="exp.customName" placeholder="自定义" :maxlength="20" style="width: 100px" size="small" />
              <n-input-number v-model:value="exp.amount" :min="0" :step="0.01" :precision="2" style="width: 140px" size="small" />
              <n-button size="small" @click="form.expenses.splice(i, 1)">×</n-button>
            </n-space>
          </n-form-item>
          <n-button size="small" @click="form.expenses.push({ category: 'food', amount: 0, customName: '' })">{{ t('report.add_expense') }}</n-button>

          <n-form-item style="margin-top: 20px">
            <n-button type="primary" :loading="saving" @click="submitManual">{{ t('common.save') }}</n-button>
          </n-form-item>
        </n-form>
      </n-tab-pane>

      <!-- Tab 2: CSV 导入 -->
      <n-tab-pane name="csv" :tab="t('report.csv_upload')">
        <n-space vertical>
          <n-upload accept=".csv" :show-file-list="true" @change="handleCSV">
            <n-button>{{ t('report.csv_upload') }}</n-button>
          </n-upload>
          <n-button text @click="downloadTemplate">{{ t('report.download_template') }}</n-button>
        </n-space>
      </n-tab-pane>

      <!-- Tab 3: 已录入记录 -->
      <n-tab-pane name="records" :tab="t('report.records')">
        <n-space vertical>
          <!-- 日期筛选 -->
          <n-space>
            <n-date-picker v-model:value="filterDateFrom" type="date" :placeholder="t('report.date_from')" style="width: 180px" />
            <n-date-picker v-model:value="filterDateTo" type="date" :placeholder="t('report.date_to')" style="width: 180px" />
            <n-button @click="loadRecords">{{ t('common.search') }}</n-button>
          </n-space>

          <!-- 空状态 -->
          <div v-if="records.length === 0" style="padding: 40px; text-align: center; color: var(--n-text-color-3)">
            {{ t('report.no_records') }}
          </div>

          <!-- 记录列表 -->
          <n-card v-for="r in records" :key="r.id" size="small" style="margin-bottom: 8px">
            <div style="display: flex; justify-content: space-between; align-items: flex-start">
              <div style="flex: 1">
                <strong style="font-size: 15px">{{ r.date }}</strong>
                <n-space style="margin-top: 4px" size="small">
                  <n-tag size="small" type="success">营收 ¥{{ (r.total_revenue || 0).toFixed(2) }}</n-tag>
                  <n-tag size="small">现金 ¥{{ (r.total_cash || 0).toFixed(2) }}</n-tag>
                  <n-tag size="small">刷卡 ¥{{ (r.total_card || 0).toFixed(2) }}</n-tag>
                </n-space>
                <!-- 支出子列表 -->
                <div v-if="r.expenses && r.expenses.length > 0" style="margin-top: 6px">
                  <span style="font-size: 12px; color: var(--n-text-color-3); margin-right: 6px">支出:</span>
                  <n-tag v-for="e in r.expenses" :key="e.id" size="tiny" style="margin: 2px 4px 2px 0" :bordered="false">
                    {{ expenseLabel(e.category) }} ¥{{ (e.amount || 0).toFixed(2) }}
                  </n-tag>
                </div>
                <div v-if="r.notes" style="margin-top: 4px; font-size: 12px; color: var(--n-text-color-3)">
                  📝 {{ r.notes }}
                </div>
              </div>
              <n-space>
                <n-button size="tiny" @click="openEdit(r)">✏️ 编辑</n-button>
                <n-button size="tiny" type="error" @click="deleteRecord(r)">🗑️</n-button>
              </n-space>
            </div>
          </n-card>
        </n-space>
      </n-tab-pane>
    </n-tabs>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEditModal" :mask-closable="false" preset="card" style="width: 520px" :title="t('report.edit_record') + ': ' + (editForm.date || '')">
      <n-form :model="editForm" label-placement="left" label-width="80">
        <n-form-item :label="t('report.date')">
          <n-date-picker v-model:value="editForm.dateTs" type="date" style="width: 180px" />
        </n-form-item>
        <n-form-item :label="t('report.total_revenue')">
          <n-input-number v-model:value="editForm.total_revenue" :min="0" :step="0.01" :precision="2" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('report.cash')">
          <n-input-number v-model:value="editForm.total_cash" :min="0" :step="0.01" :precision="2" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('report.card')">
          <n-input-number v-model:value="editForm.total_card" :min="0" :step="0.01" :precision="2" style="width: 100%" />
        </n-form-item>
        <n-form-item :label="t('report.difference')">
          <span :style="{ color: editDiffColor, fontWeight: 'bold', fontSize: '16px' }">{{ editDiffStr }}</span>
        </n-form-item>
        <n-form-item :label="t('report.notes')">
          <n-input v-model:value="editForm.notes" type="textarea" />
        </n-form-item>

        <n-divider>{{ t('report.expenses') }}</n-divider>
        <n-form-item v-for="(exp, i) in editForm.expenses" :key="i" :label="t('report.expenses')">
          <n-space>
            <n-select v-model:value="exp.category" :options="expenseCategoryOptions" style="width: 110px" size="small" />
            <n-input v-if="exp.category === 'other'" v-model:value="exp.customName" placeholder="自定义" :maxlength="20" style="width: 100px" size="small" />
            <n-input-number v-model:value="exp.amount" :min="0" :step="0.01" :precision="2" style="width: 140px" size="small" />
            <n-button size="small" @click="editForm.expenses.splice(i, 1)">×</n-button>
          </n-space>
        </n-form-item>
        <n-button size="small" @click="editForm.expenses.push({ category: 'food', amount: 0, customName: '' })">{{ t('report.add_expense') }}</n-button>

        <n-space style="margin-top: 20px; justify-content: flex-end">
          <n-button @click="showEditModal = false">{{ t('common.cancel') }}</n-button>
          <n-button type="primary" :loading="editSaving" @click="saveEdit">{{ t('common.save') }}</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onErrorCaptured } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { reportsAPI, expensesAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const activeTab = ref('manual');
const saving = ref(false);
const editSaving = ref(false);
const showEditModal = ref(false);

// 筛选（默认近30天）
const now = new Date();
const defaultFrom = new Date(now);
defaultFrom.setDate(now.getDate() - 30);
const filterDateFrom = ref(defaultFrom.getTime());
const filterDateTo = ref(now.getTime());

// 表单
const form = ref({
  date: new Date().getTime(),
  total_revenue: 0, total_cash: 0, total_card: 0, notes: '',
  expenses: [{ category: 'food', amount: 0, customName: '' }],
});

// 长短款 = 总营收 - (现金 + 刷卡) — 手动录入
const diffAmount = computed(() => {
  const rev = Number(form.value.total_revenue) || 0;
  const cash = Number(form.value.total_cash) || 0;
  const card = Number(form.value.total_card) || 0;
  return cash + card - rev;
});
const diffStr = computed(() => {
  const v = diffAmount.value;
  return (v >= 0 ? '+' : '') + v.toFixed(2);
});
const diffColor = computed(() => diffAmount.value >= 0 ? '#16A34A' : '#DC2626');

// 长短款 — 编辑弹窗
const editDiffAmount = computed(() => {
  const rev = Number(editForm.value.total_revenue) || 0;
  const cash = Number(editForm.value.total_cash) || 0;
  const card = Number(editForm.value.total_card) || 0;
  return cash + card - rev;
});
const editDiffStr = computed(() => {
  const v = editDiffAmount.value;
  return (v >= 0 ? '+' : '') + v.toFixed(2);
});
const editDiffColor = computed(() => editDiffAmount.value >= 0 ? '#16A34A' : '#DC2626');

const expenseCategoryOptions = computed(() => [
  { label: t('report.food'), value: 'food' },
  { label: t('report.beverage'), value: 'beverage' },
  { label: t('report.rent'), value: 'rent' },
  { label: t('report.utilities'), value: 'utilities' },
  { label: t('report.other'), value: 'other' },
]);

// 记录列表
const records = ref([]);

async function loadRecords() {
  const from = filterDateFrom.value ? new Date(filterDateFrom.value).toISOString().split('T')[0] : undefined;
  const to = filterDateTo.value ? new Date(filterDateTo.value).toISOString().split('T')[0] : undefined;
  try {
    const [reportsRes, expensesRes] = await Promise.all([
      reportsAPI.posList(from, to),
      expensesAPI.list(from, to),
    ]);
    const reports = reportsRes.data;
    const expenses = expensesRes.data || [];
    // 按日期分组支出
    const expMap = {};
    for (const e of expenses) {
      if (!expMap[e.date]) expMap[e.date] = [];
      expMap[e.date].push(e);
    }
    for (const r of reports) {
      r.expenses = expMap[r.date] || [];
    }
    records.value = reports;
  } catch (err) {
    console.error(err);
    message.error(t('report.load_failed') || '加载失败');
  }
}

// 编辑弹窗
const editForm = ref({
  id: null,
  date: '',
  dateTs: null,
  total_revenue: 0, total_cash: 0, total_card: 0, notes: '',
  expenses: [],
});
let deletedExpenseIds = []; // 收集删除的支出ID

function openEdit(r) {
  deletedExpenseIds = [];
  editForm.value = {
    id: r.id,
    date: r.date,
    dateTs: new Date(r.date).getTime(),
    total_revenue: r.total_revenue,
    total_cash: r.total_cash,
    total_card: r.total_card,
    notes: r.notes || '',
    expenses: (r.expenses || []).map(e => ({
      _id: e.id, // 标记已有支出ID
      category: e.category,
      amount: e.amount,
      customName: e.category === 'other' && e.description ? e.description : '',
    })),
  };
  if (editForm.value.expenses.length === 0) {
    editForm.value.expenses.push({ category: 'food', amount: 0, customName: '' });
  }
  showEditModal.value = true;
}

async function saveEdit() {
  editSaving.value = true;
  try {
    const date = editForm.value.dateTs ? new Date(editForm.value.dateTs).toISOString().split('T')[0] : editForm.value.date;

    // 1. 更新日报
    await reportsAPI.posUpdate(editForm.value.id, {
      date,
      total_revenue: round2(editForm.value.total_revenue),
      total_cash: round2(editForm.value.total_cash),
      total_card: round2(editForm.value.total_card),
      notes: editForm.value.notes,
    });

    // 2. 处理支出
    for (const e of editForm.value.expenses) {
      const desc = e.category === 'other' && e.customName ? e.customName : undefined;
      if (e._id) {
        await expensesAPI.update(e._id, { date, category: e.category, amount: round2(e.amount), description: desc });
      } else if (e.amount > 0) {
        await expensesAPI.create({ date, category: e.category, amount: round2(e.amount), description: desc });
      }
    }

    showEditModal.value = false;
    message.success(t('common.save_success') || '保存成功');
    await loadRecords();
  } catch (err) {
    console.error(err);
    message.error(t('common.save_failed') || '保存失败');
  } finally {
    editSaving.value = false;
  }
}

async function deleteRecord(r) {
  try {
    // 删除关联支出
    if (r.expenses && r.expenses.length > 0) {
      await Promise.all(r.expenses.map(e => expensesAPI.remove(e.id)));
    }
    await reportsAPI.posDelete(r.id);
    message.success(t('common.delete_success') || '已删除');
    await loadRecords();
  } catch (err) {
    console.error(err);
    message.error(t('common.delete_failed') || '删除失败');
  }
}

// 支出类别中文名
function expenseLabel(cat) {
  const map = { food: t('report.food'), beverage: t('report.beverage'), rent: t('report.rent'), utilities: t('report.utilities'), other: t('report.other') };
  return map[cat] || cat;
}

// 手工录入
function round2(v) { return Math.round(Number(v) * 100) / 100; }

async function submitManual() {
  saving.value = true;
  try {
    const d = form.value.date ? new Date(form.value.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    await reportsAPI.posCreate({ date: d, total_revenue: round2(form.value.total_revenue), total_cash: round2(form.value.total_cash), total_card: round2(form.value.total_card), notes: form.value.notes });
    for (const exp of form.value.expenses) {
      if (exp.amount > 0) {
        const desc = exp.category === 'other' && exp.customName ? exp.customName : undefined;
        await expensesAPI.create({ date: d, category: exp.category, amount: round2(exp.amount), description: desc });
      }
    }
    message.success(t('report.import_success'));
    // 清空表单
    form.value = {
      date: new Date().getTime(),
      total_revenue: 0, total_cash: 0, total_card: 0, notes: '',
      expenses: [{ category: 'food', amount: 0, customName: '' }],
    };
  } catch (err) {
    message.error(t('report.import_failed'));
  } finally {
    saving.value = false;
  }
}

// CSV
async function handleCSV({ file }) {
  if (file.status === 'finished') {
    try {
      await reportsAPI.posImportCSV(file.file);
      message.success(t('report.import_success'));
    } catch (err) {
      message.error(t('report.csv_format_error'));
    }
  }
}

function downloadTemplate() {
  const csv = 'Date,Total,Cash,Card,Food,Beverage,Rent,Utilities,Other\n2026-06-16,1500.00,500.00,1000.00,400.00,200.00,100.00,50.00,30.00';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'pos_template.csv'; a.click();
}

// 捕获渲染错误，不崩掉整个组件
onErrorCaptured((err, instance, info) => {
  console.error('ReportImportView render error:', err, info);
  return false; // 阻止向上传播
});

// 切换到 records 分页时加载
watch(activeTab, (tab) => {
  if (tab === 'records') loadRecords();
});
</script>
