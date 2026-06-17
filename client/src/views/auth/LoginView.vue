<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--n-color-body)">
    <n-card style="width: 380px" :title="t('auth.login')">
      <n-form @submit.prevent="handleLogin">
        <n-form-item :label="t('auth.email')">
          <n-input v-model:value="email" type="email" :placeholder="t('auth.email')" />
        </n-form-item>
        <n-form-item :label="t('auth.password')">
          <n-input v-model:value="password" type="password" :placeholder="t('auth.password')" />
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleLogin">{{ t('auth.login') }}</n-button>
      </n-form>
      <p style="text-align: center; margin-top: 16px">
        <n-button text type="primary" @click="$router.push('/register')">{{ t('auth.no_account') }}</n-button><br />
        <n-button text type="primary" @click="$router.push('/forgot-password')" style="margin-top: 4px">忘记密码？</n-button>
      </p>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../../store/auth';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    message.success('登录成功');
    if (auth.isOwner) router.push('/dashboard');
    else if (auth.user?.role === 'manager') router.push('/manager/schedule');
    else router.push('/my/schedule');
  } catch (err) {
    message.error(err.response?.data?.error || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>
