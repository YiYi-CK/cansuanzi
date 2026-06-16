<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--n-color-body)">
    <n-card style="width: 400px" :title="t('auth.register')">
      <n-form>
        <n-form-item :label="t('auth.restaurant_name')">
          <n-input v-model:value="restaurantName" />
        </n-form-item>
        <n-form-item :label="t('auth.name')">
          <n-input v-model:value="name" />
        </n-form-item>
        <n-form-item :label="t('auth.email')">
          <n-input v-model:value="email" type="email" />
        </n-form-item>
        <n-form-item :label="t('auth.password')">
          <n-input v-model:value="password" type="password" />
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleRegister">{{ t('auth.register') }}</n-button>
      </n-form>
      <p style="text-align: center; margin-top: 16px">
        <n-button text type="primary" @click="$router.push('/login')">{{ t('auth.has_account') }}</n-button>
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

const name = ref('');
const email = ref('');
const password = ref('');
const restaurantName = ref('');
const loading = ref(false);

async function handleRegister() {
  loading.value = true;
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value, restaurant_name: restaurantName.value });
    message.success('注册成功');
    router.push('/dashboard');
  } catch (err) {
    message.error(err.response?.data?.error || '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>
