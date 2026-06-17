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

/* Mobile responsive content padding */
.app-content { padding: 16px !important; }
@media (max-width: 768px) {
  .app-content { padding: 8px !important; }
}
@media (max-width: 480px) {
  .auth-card .n-card__content { padding: 12px !important; }
  .auth-card .n-card-header { padding: 12px 12px 0 !important; }
  button.n-button.n-button--block { min-height: 44px; font-size: 16px; }
}

/* Data table mobile responsiveness */
.n-data-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Compact table cells on mobile */
@media (max-width: 768px) {
  .n-data-table td.n-data-table-td,
  .n-data-table th.n-data-table-th {
    padding: 6px 8px !important;
    font-size: 12px !important;
    white-space: nowrap;
  }
  .n-data-table .n-button.n-button--small {
    font-size: 11px !important;
    padding: 0 6px !important;
    height: 26px !important;
  }
  .n-data-table .n-tag {
    font-size: 11px !important;
    padding: 0 4px !important;
    height: 22px !important;
  }
  .n-data-table .n-tag .n-tag__content {
    font-size: 11px !important;
  }
}

/* Responsive search bar */
@media (max-width: 480px) {
  .n-space[style*="justify-content: space-between"] {
    flex-direction: column !important;
    gap: 8px !important;
  }
  .n-input-group {
    width: 100% !important;
  }
  .n-input-group .n-input {
    width: 100% !important;
  }
  input[style*="width: 200px"] {
    width: 100% !important;
    max-width: 100% !important;
  }
}

/* Responsive modals */
@media (max-width: 480px) {
  .n-modal[style*="width: 500px"],
  .n-modal[style*="width: 420px"],
  .n-modal[style*="width: 380px"] {
    width: 95vw !important;
    max-width: 95vw !important;
  }
}

/* Responsive date picker */
@media (max-width: 480px) {
  .n-date-picker {
    width: 100% !important;
  }
  .n-date-picker .n-date-picker-panel {
    width: 100% !important;
  }
}

/* Responsive tabs */
@media (max-width: 480px) {
  .n-tabs {
    font-size: 13px !important;
  }
}

/* Make space elements stack on mobile */
@media (max-width: 768px) {
  .n-space[style*="gap: 12px"][style*="align-items: center"] {
    flex-wrap: wrap !important;
  }
}

/* Ensure h2 margins are smaller on mobile */
@media (max-width: 768px) {
  .n-h2 {
    font-size: 18px !important;
  }
}

/* Fix NButton text overflow on mobile */
.n-button--small.n-button--text {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
