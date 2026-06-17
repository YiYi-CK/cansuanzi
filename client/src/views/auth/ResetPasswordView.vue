<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--n-color-body)">
    <n-card style="width: 400px" title="重置密码">
      <n-form v-if="!reset">
        <n-form-item label="新密码">
          <n-input v-model:value="password" type="password" placeholder="输入新密码" />
        </n-form-item>
        <n-form-item label="确认密码">
          <n-input v-model:value="confirm" type="password" placeholder="再次输入新密码" />
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleReset">重置密码</n-button>
      </n-form>
      <div v-else style="text-align: center">
        <p>✅ 密码已重置成功！</p>
        <n-button type="primary" @click="$router.push('/login')" style="margin-top: 12px">去登录</n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { authAPI } from '../../api/endpoints';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const reset = ref(false);
const token = ref('');

onMounted(() => {
  token.value = route.params.token;
  if (!token.value) { message.error('无效的重置链接'); router.push('/login'); }
});

async function handleReset() {
  if (!password.value || password.value.length < 6) { message.error('密码至少6位'); return; }
  if (password.value !== confirm.value) { message.error('两次密码不一致'); return; }
  loading.value = true;
  try {
    await authAPI.resetPassword(token.value, password.value);
    reset.value = true;
  } catch (err) {
    message.error(err.response?.data?.error || '重置失败');
  } finally {
    loading.value = false;
  }
}
</script>
