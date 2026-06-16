<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('settings.title') }}</n-h2>
    <n-form :model="form" label-placement="left" label-width="130" style="max-width: 500px">
      <n-form-item :label="t('settings.restaurant_name')"><n-input v-model:value="form.restaurant_name" /></n-form-item>

      <n-divider>{{ t('settings.wage_formula') }}</n-divider>
      <n-alert type="warning" style="margin-bottom: 12px">{{ t('settings.compliance_warning') }}</n-alert>
      <n-form-item :label="t('settings.saturday_loading')"><n-input-number v-model:value="form.saturday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.sunday_loading')"><n-input-number v-model:value="form.sunday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.holiday_loading')"><n-input-number v-model:value="form.public_holiday_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.late_night_loading')"><n-input-number v-model:value="form.late_night_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item :label="t('settings.casual_loading')"><n-input-number v-model:value="form.casual_loading" :step="0.01" style="width: 150px" /></n-form-item>
      <n-form-item>
        <n-button @click="resetToDefaults">{{ t('settings.reset_to_default') }}</n-button>
      </n-form-item>

      <n-divider>{{ t('settings.public_holidays') }}</n-divider>
      <n-space v-for="(h, i) in form.public_holidays" :key="i" style="margin-bottom: 8px">
        <n-date-picker v-model:value="h.date" type="date" size="small" style="width: 160px" />
        <n-input v-model:value="h.name" size="small" style="width: 200px" />
        <n-button size="small" @click="form.public_holidays.splice(i, 1)">×</n-button>
      </n-space>
      <n-button size="small" @click="form.public_holidays.push({ date: null, name: '' })">{{ t('settings.add_holiday') }}</n-button>

      <n-divider>{{ t('settings.language') }}</n-divider>
      <n-radio-group v-model:value="form.language">
        <n-radio value="zh">中文</n-radio>
        <n-radio value="en">English</n-radio>
      </n-radio-group>

      <n-form-item style="margin-top: 24px">
        <n-button type="primary" :loading="saving" @click="saveSettings">{{ t('settings.save_settings') }}</n-button>
      </n-form-item>
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
  saturday_loading: 1.25, sunday_loading: 1.50, public_holiday_loading: 2.50, late_night_loading: 1.50, casual_loading: 0.25,
  public_holidays: [],
});

function resetToDefaults() {
  form.value.saturday_loading = defaults.value.saturday_loading;
  form.value.sunday_loading = defaults.value.sunday_loading;
  form.value.public_holiday_loading = defaults.value.public_holiday_loading;
  form.value.late_night_loading = defaults.value.late_night_loading;
  form.value.casual_loading = defaults.value.casual_loading;
}

async function saveSettings() {
  saving.value = true;
  try {
    await settingsAPI.update(form.value);
    if (form.value.language !== locale.value) {
      locale.value = form.value.language;
      localStorage.setItem('language', form.value.language);
    }
    message.success('设置已保存');
  } catch (err) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const res = await settingsAPI.get();
  const data = res.data;
  defaults.value = data.defaults || {};
  form.value = { ...data };
  form.value.public_holidays = data.public_holidays || [];
});
</script>
