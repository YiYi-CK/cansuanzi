<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('settings.title') }}</n-h2>
    <n-form :model="form" label-placement="left" label-width="130" style="max-width: 500px">
      <n-form-item :label="t('settings.restaurant_name')"><n-input v-model:value="form.restaurant_name" /></n-form-item>

      <n-divider>营业时间</n-divider>
      <n-form-item label="营业">
        <n-space><input type="time" v-model="form.operating_start" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" /><span>—</span><input type="time" v-model="form.operating_end" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" /></n-space>
      </n-form-item>
      <n-form-item label="午休">
        <n-space><input type="time" v-model="form.break_start" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" /><span>—</span><input type="time" v-model="form.break_end" style="padding:6px 10px;border:1px solid var(--n-border-color);border-radius:6px;font-size:14px;background:var(--n-color)" /></n-space>
      </n-form-item>
      <n-form-item label="营业日">
        <n-checkbox-group v-model:value="form.operating_days"><n-space><n-checkbox v-for="d in dayOptions" :key="d.value" :value="d.value" :label="d.label" /></n-space></n-checkbox-group>
      </n-form-item>

      <n-divider>工位配置</n-divider>
      <n-form-item label="工位列表"><n-dynamic-tags v-model:value="form.stations" /></n-form-item>

      <n-divider>{{ t('settings.wage_formula') }}</n-divider>
      <n-alert type="warning" style="margin-bottom: 12px">{{ t('settings.compliance_warning') }}</n-alert>
      <n-form-item :label="t('settings.saturday_loading')"><n-input-number v-model:value="form.saturday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.sunday_loading')"><n-input-number v-model:value="form.sunday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.holiday_loading')"><n-input-number v-model:value="form.public_holiday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.late_night_loading')"><n-input-number v-model:value="form.late_night_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.casual_loading')"><n-input-number v-model:value="form.casual_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item><n-button @click="resetToDefaults">{{ t('settings.reset_to_default') }}</n-button></n-form-item>

      <n-divider>{{ t('settings.public_holidays') }}</n-divider>
      <n-space v-for="(h, i) in form.public_holidays" :key="i" style="margin-bottom: 8px"><n-date-picker v-model:value="h.date" type="date" size="small" style="width: 160px" /><n-input v-model:value="h.name" size="small" style="width: 200px" /><n-button size="small" @click="form.public_holidays.splice(i, 1)">×</n-button></n-space>
      <n-button size="small" @click="form.public_holidays.push({ date: null, name: '' })">{{ t('settings.add_holiday') }}</n-button>

      <n-divider>{{ t('settings.language') }}</n-divider>
      <n-radio-group v-model:value="form.language"><n-radio value="zh">中文</n-radio><n-radio value="en">English</n-radio></n-radio-group>

      <n-form-item style="margin-top: 24px"><n-button type="primary" :loading="saving" @click="saveSettings">{{ t('settings.save_settings') }}</n-button></n-form-item>
    </n-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { settingsAPI } from '../../api/endpoints';

const { t, locale } = useI18n();
const message = useMessage();
const saving = ref(false);
const defaults = ref({});

const form = ref({
  restaurant_name: '', language: 'zh',
  operating_start: '08:00', operating_end: '21:00', break_start: '', break_end: '',
  operating_days: [1,2,3,4,5,6,7],
  stations: ['前台','厨房','大厅'],
  saturday_loading: 1.25, sunday_loading: 1.50, public_holiday_loading: 2.50, late_night_loading: 1.50, casual_loading: 0.25,
  public_holidays: [],
});

const dayOptions = [
  { label: '周一', value: 1 }, { label: '周二', value: 2 }, { label: '周三', value: 3 },
  { label: '周四', value: 4 }, { label: '周五', value: 5 }, { label: '周六', value: 6 }, { label: '周日', value: 7 },
];

function resetToDefaults() {
  const d = defaults.value;
  form.value.saturday_loading = d.saturday_loading;
  form.value.sunday_loading = d.sunday_loading;
  form.value.public_holiday_loading = d.public_holiday_loading;
  form.value.late_night_loading = d.late_night_loading;
  form.value.casual_loading = d.casual_loading;
}

async function saveSettings() {
  saving.value = true;
  try {
    await settingsAPI.update(form.value);
    if (form.value.language !== locale.value) { locale.value = form.value.language; localStorage.setItem('language', form.value.language); }
    message.success('设置已保存');
  } catch (err) { message.error('保存失败'); } finally { saving.value = false; }
}

onMounted(async () => {
  const res = await settingsAPI.get();
  const data = res.data;
  defaults.value = data.defaults || {};
  form.value = { ...data,
    operating_start: data.operating_start || '08:00', operating_end: data.operating_end || '21:00',
    break_start: data.break_start || '', break_end: data.break_end || '',
    operating_days: data.operating_days || [1,2,3,4,5,6,7],
    stations: data.stations || ['前台','厨房','大厅'],
  };
  form.value.public_holidays = data.public_holidays || [];
});
</script>
