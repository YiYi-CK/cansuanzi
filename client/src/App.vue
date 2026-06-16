<template>
  <n-config-provider :theme="theme" :locale="naiveLang" :date-locale="naiveDateLang">
    <n-notification-provider>
      <n-message-provider>
        <router-view />
      </n-message-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup>
import { computed } from 'vue';
import { darkTheme, zhCN, enUS, dateZhCN, dateEnUS } from 'naive-ui';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

const naiveLang = computed(() => locale.value === 'zh' ? zhCN : enUS);
const naiveDateLang = computed(() => locale.value === 'zh' ? dateZhCN : dateEnUS);
const theme = computed(() => {
  const dark = localStorage.getItem('darkMode') === 'true';
  return dark ? darkTheme : null;
});
</script>

<style>
body { margin: 0; font-family: 'Inter', 'Noto Sans SC', sans-serif; }
#app { min-height: 100vh; }
</style>
