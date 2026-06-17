<template>
  <n-layout style="min-height: 100vh">
    <n-layout-header bordered class="app-header">
      <div class="header-left">
        <n-button class="mobile-menu-btn" @click="drawerOpen = true" quaternary>
          <n-icon size="22"><MenuOutline /></n-icon>
        </n-button>
        <n-icon size="24" color="#EA580C"><RestaurantOutline /></n-icon>
        <span class="app-title">{{ t('common.app_name') }}</span>
        <n-menu class="desktop-nav" mode="horizontal" :options="menuOptions" :value="currentRoute" @update:value="navigate" />
      </div>
      <div class="header-right">
        <n-button @click="toggleDark" quaternary>
          <n-icon><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></n-icon>
        </n-button>
        <n-dropdown :options="userOptions" @select="handleUserAction">
          <n-button text class="user-name">{{ auth.user?.name }}</n-button>
        </n-dropdown>
      </div>
    </n-layout-header>
    <n-drawer v-model:show="drawerOpen" :width="240" placement="left">
      <n-drawer-content :title="auth.user?.name || t('common.app_name')" closable>
        <n-menu :options="menuOptions" :value="currentRoute" @update:value="(k) => { navigate(k); drawerOpen = false; }" />
      </n-drawer-content>
    </n-drawer>
    <n-layout-content class="app-content">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>

<script setup>
import { computed, ref, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { NIcon } from 'naive-ui';
import { useAuthStore } from '../store/auth';
import {
  RestaurantOutline, MoonOutline, SunnyOutline,
  CalendarOutline, DocumentTextOutline, PersonOutline,
  MenuOutline,
} from '@vicons/ionicons5';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const drawerOpen = ref(false);

const isDark = computed(() => localStorage.getItem('darkMode') === 'true');
const toggleDark = () => {
  localStorage.setItem('darkMode', isDark.value ? 'false' : 'true');
  window.location.reload();
};

const currentRoute = computed(() => route.path);

const renderIcon = (icon) => () => h(NIcon, null, { default: () => h(icon) });

const menuOptions = computed(() => [
  { label: t('nav.my_schedule'), key: '/my/schedule', icon: renderIcon(CalendarOutline) },
  { label: t('nav.my_requests'), key: '/my/requests', icon: renderIcon(DocumentTextOutline) },
  { label: t('nav.my_profile'), key: '/my/profile', icon: renderIcon(PersonOutline) },
]);

const userOptions = [
  { label: t('nav.logout'), key: 'logout' },
];

const navigate = (key) => router.push(key);

const handleUserAction = (key) => {
  if (key === 'logout') {
    auth.logout();
    router.push('/login');
  }
};
</script>

<style scoped>
.app-header {
  padding: 0 12px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.app-title {
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}
.desktop-nav { display: none; }
@media (min-width: 769px) {
  .app-header { padding: 0 24px; }
  .mobile-menu-btn { display: none; }
  .desktop-nav { display: flex; }
}
.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
