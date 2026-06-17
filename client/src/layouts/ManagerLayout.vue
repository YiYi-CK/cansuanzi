<template>
  <n-layout style="min-height: 100vh">
    <n-layout-header bordered style="padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between">
      <div style="display: flex; align-items: center; gap: 8px">
        <n-icon size="24" color="#EA580C"><RestaurantOutline /></n-icon>
        <span style="font-size: 18px; font-weight: 700">{{ t('common.app_name') }}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px">
        <n-button @click="toggleDark">
          <n-icon><MoonOutline v-if="!isDark" /><SunnyOutline v-else /></n-icon>
        </n-button>
        <n-dropdown :options="userOptions" @select="handleUserAction">
          <n-button text>{{ auth.user?.name }}</n-button>
        </n-dropdown>
      </div>
    </n-layout-header>
    <n-layout has-sider>
      <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="200" :collapsed="collapsed">
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="64"
          :options="menuOptions"
          :value="currentRoute"
          @update:value="navigate"
        />
      </n-layout-sider>
      <n-layout-content style="padding: 24px">
        <router-view />
      </n-layout-content>
    </n-layout>
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
  CalendarOutline,
} from '@vicons/ionicons5';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const collapsed = ref(false);

const isDark = computed(() => localStorage.getItem('darkMode') === 'true');
const toggleDark = () => {
  localStorage.setItem('darkMode', isDark.value ? 'false' : 'true');
  window.location.reload();
};

const currentRoute = computed(() => route.path);

const renderIcon = (icon) => () => h(NIcon, null, { default: () => h(icon) });

const menuOptions = computed(() => [
  { label: t('nav.schedule'), key: '/schedule', icon: renderIcon(CalendarOutline) },
]);

const userOptions = [
  { label: t('nav.my_schedule'), key: 'my-schedule' },
  { label: t('nav.logout'), key: 'logout' },
];

const navigate = (key) => router.push(key);

const handleUserAction = (key) => {
  if (key === 'logout') {
    auth.logout();
    router.push('/login');
  } else if (key === 'my-schedule') {
    router.push('/my/schedule');
  }
};
</script>
