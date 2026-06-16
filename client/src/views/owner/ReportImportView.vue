<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('report.import_daily') }}</n-h2>
    <n-tabs v-model:value="mode">
      <n-tab-pane name="manual" :tab="t('report.manual_entry')">
        <n-form :model="form" label-placement="left" label-width="80" style="max-width: 400px">
          <n-form-item :label="t('report.date')"><n-date-picker v-model:value="form.date" type="date" /></n-form-item>
          <n-form-item :label="t('report.total_revenue')"><n-input-number v-model:value="form.total_revenue" :min="0" :step="0.01" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.cash')"><n-input-number v-model:value="form.total_cash" :min="0" :step="0.01" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.card')"><n-input-number v-model:value="form.total_card" :min="0" :step="0.01" style="width: 100%" /></n-form-item>
          <n-form-item :label="t('report.notes')"><n-input v-model:value="form.notes" type="textarea" /></n-form-item>

          <n-divider>{{ t('report.expenses') }}</n-divider>
          <n-form-item v-for="(exp, i) in form.expenses" :key="i" :label="exp.category">
            <n-space>
              <n-input-number v-model:value="exp.amount" :min="0" :step="0.01" style="width: 140px" />
              <n-button size="small" @click="form.expenses.splice(i, 1)">×</n-button>
            </n-space>
          </n-form-item>
          <n-button size="small" @click="form.expenses.push({ category: 'food', amount: 0 })">+ 添加支出</n-button>

          <n-form-item style="margin-top: 20px">
            <n-button type="primary" :loading="saving" @click="submitManual">{{ t('common.save') }}</n-button>
          </n-form-item>
        </n-form>
      </n-tab-pane>
      <n-tab-pane name="csv" :tab="t('report.csv_upload')">
        <n-space vertical>
          <n-upload accept=".csv" :show-file-list="true" @change="handleCSV">
            <n-button>{{ t('report.csv_upload') }}</n-button>
          </n-upload>
          <n-button text @click="downloadTemplate">{{ t('report.download_template') }}</n-button>
        </n-space>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { reportsAPI, expensesAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const mode = ref('manual');
const saving = ref(false);

const form = ref({
  date: new Date().getTime(),
  total_revenue: 0, total_cash: 0, total_card: 0, notes: '',
  expenses: [{ category: 'food', amount: 0 }],
});

async function submitManual() {
  saving.value = true;
  try {
    const d = form.value.date ? new Date(form.value.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    await reportsAPI.posCreate({ date: d, total_revenue: form.value.total_revenue, total_cash: form.value.total_cash, total_card: form.value.total_card, notes: form.value.notes });
    for (const exp of form.value.expenses) {
      if (exp.amount > 0) await expensesAPI.create({ date: d, category: exp.category, amount: exp.amount });
    }
    message.success(t('report.import_success'));
  } catch (err) {
    message.error(t('report.import_failed'));
  } finally {
    saving.value = false;
  }
}

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
</script>
