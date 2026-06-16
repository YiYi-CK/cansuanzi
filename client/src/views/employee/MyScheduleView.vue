<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.my_schedule') }}</n-h2>
    <n-spin :show="loading">
      <n-empty v-if="shifts.length === 0" description="本周暂无排班" style="padding: 40px" />
      <n-list v-else>
        <n-list-item v-for="s in shifts" :key="s.id">
          <n-tag type="success" style="margin-right: 8px">{{ s.date }}</n-tag>
          {{ s.start_time }} — {{ s.end_time }}
          <span v-if="s.area" style="color: var(--n-text-color-3); margin-left: 8px">| {{ s.area }}</span>
        </n-list-item>
      </n-list>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { shiftsAPI } from '../../api/endpoints';

const { t } = useI18n();
const loading = ref(false);
const shifts = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    today.setDate(today.getDate() + 7);
    const to = today.toISOString().split('T')[0];
    shifts.value = (await shiftsAPI.list(from, to)).data;
  } catch (err) { console.error(err); } finally { loading.value = false; }
});
</script>
