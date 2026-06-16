<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.my_profile') }}</n-h2>
    <n-form :model="form" label-placement="left" label-width="80" style="max-width: 400px">
      <n-form-item :label="t('auth.name')"><n-input v-model:value="form.name" /></n-form-item>
      <n-form-item :label="t('auth.email')"><n-input v-model:value="form.email" /></n-form-item>
      <n-form-item :label="t('auth.password')"><n-input v-model:value="form.password" type="password" placeholder="留空不修改" /></n-form-item>
      <n-form-item>
        <n-button type="primary" :loading="saving" @click="saveProfile">{{ t('common.save') }}</n-button>
      </n-form-item>
    </n-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../../store/auth';
import { employeesAPI } from '../../api/endpoints';

const { t } = useI18n();
const message = useMessage();
const auth = useAuthStore();
const saving = ref(false);

const form = ref({
  name: auth.user?.name || '',
  email: auth.user?.email || '',
  password: '',
});

async function saveProfile() {
  saving.value = true;
  try {
    await employeesAPI.update(auth.user.id, { name: form.value.name, email: form.value.email });
    message.success('保存成功');
  } catch (err) {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}
</script>
