<template>
  <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--n-color-body)">
    <n-card style="width: 400px" title="找回密码">
      <n-form v-if="!sent">
        <n-form-item label="邮箱">
          <n-input v-model:value="email" type="email" placeholder="输入注册时使用的邮箱" />
        </n-form-item>
        <n-alert v-if="resetUrl" type="success" style="margin-bottom: 12px">
          开发模式 — 重置链接：<br />
          <a :href="resetUrl" style="word-break: break-all">{{ resetUrl }}</a>
        </n-alert>
        <n-button type="primary" block :loading="loading" @click="handleForgot">发送重置链接</n-button>
      </n-form>
      <div v-else style="text-align: center">
        <p>✅ 如果该邮箱已注册，重置链接已发送。</p>
        <p style="font-size: 13px; color: var(--n-text-color-3); margin-top: 8px">请检查邮箱（开发模式可在下方查看链接）</p>
        <n-button text type="primary" @click="$router.push('/login')" style="margin-top: 12px">返回登录</n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { authAPI } from '../../api/endpoints';

const router = useRouter();
const message = useMessage();
const email = ref('');
const loading = ref(false);
const sent = ref(false);
const resetUrl = ref('');

async function handleForgot() {
  if (!email.value) { message.error('请输入邮箱'); return; }
  loading.value = true;
  try {
    const res = await authAPI.forgotPassword(email.value);
    if (res.data.reset_url) resetUrl.value = res.data.reset_url;
    sent.value = true;
  } catch (err) {
    message.error(err.response?.data?.error || '发送失败');
  } finally {
    loading.value = false;
  }
}
</script>
