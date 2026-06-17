<template>
  <div>
    <n-h2 style="margin-top: 0">{{ t('nav.dashboard') }}</n-h2>

    <n-date-picker v-model:value="dateRange" type="daterange" style="margin-bottom: 20px" @update:value="fetchData" />

    <n-spin :show="loading">
      <!-- 三卡片 -->
      <n-grid cols="3" x-gap="12" responsive="screen">
        <n-grid-item>
          <n-card :title="t('dashboard.total_revenue')" size="small">
            <n-statistic tabular-nums>
              <n-number-animation :from="0" :to="data.totalRevenue" :precision="2" />
            </n-statistic>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card :title="t('dashboard.total_expenses')" size="small">
            <n-statistic tabular-nums>
              <n-number-animation :from="0" :to="data.totalExpenses" :precision="2" />
            </n-statistic>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card :title="t('dashboard.net_profit')" size="small" :style="{ color: data.netProfit >= 0 ? '#16A34A' : '#DC2626' }">
            <n-statistic tabular-nums>
              <n-number-animation :from="0" :to="data.netProfit" :precision="2" />
            </n-statistic>
          </n-card>
        </n-grid-item>
      </n-grid>

      <n-grid cols="2" x-gap="16" style="margin-top: 20px" responsive="screen">
        <!-- 支出构成 -->
        <n-grid-item>
          <n-card :title="t('dashboard.expense_breakdown')" size="small">
            <div v-if="data.breakdown.length === 0" style="text-align: center; color: var(--n-text-color-3); padding: 40px 0">
              暂无数据
            </div>
            <div v-for="item in data.breakdown" :key="item.category" style="margin-bottom: 12px">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px">
                <span>{{ item.category }}</span>
                <span>${{ item.amount.toFixed(2) }} ({{ item.percentage }}%)</span>
              </div>
              <n-progress type="line" :percentage="item.percentage" :color="colors[item.category] || '#EA580C'" :height="8" :border-radius="4" />
            </div>
          </n-card>
        </n-grid-item>

        <!-- 趋势 -->
        <n-grid-item>
          <n-card :title="t('dashboard.trend_7d')" size="small">
            <div v-if="data.trend.length === 0" style="text-align: center; color: var(--n-text-color-3); padding: 40px 0">
              暂无数据
            </div>
            <div v-else style="display: flex; align-items: flex-end; gap: 8px; height: 150px">
              <div v-for="item in data.trend" :key="item.date" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end">
                <span style="font-size: 10px; margin-bottom: 4px">{{ item.revenue > 0 ? '$' + Number(item.revenue).toFixed(2) : '' }}</span>
                <div :style="{ height: Math.max(item.revenue / maxRevenue * 100, 4) + '%', width: '100%', background: '#EA580C', borderRadius: '4px 4px 0 0', minHeight: '4px' }" />
                <span style="font-size: 10px; margin-top: 4px">{{ formatDay(item.date) }}</span>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 今日排班 -->
      <n-card :title="t('dashboard.today_schedule')" size="small" style="margin-top: 20px">
        <n-empty v-if="data.todayShifts.length === 0" :description="t('dashboard.no_schedule')" style="padding: 20px">
          <template #extra>
            <n-button type="primary" @click="$router.push('/schedule')">{{ t('dashboard.go_schedule') }}</n-button>
          </template>
        </n-empty>
        <n-tag v-for="shift in data.todayShifts" :key="shift.id" style="margin: 0 8px 8px 0" :type="shift.name ? 'success' : 'error'">
          {{ shift.name || t('dashboard.vacant') }} {{ shift.start_time }}-{{ shift.end_time }}
        </n-tag>
      </n-card>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { dashboardAPI } from '../../api/endpoints';

const { t, locale } = useI18n();
const loading = ref(false);
const dateRange = ref(null);

const data = ref({
  totalRevenue: 0, totalExpenses: 0, netProfit: 0,
  breakdown: [], trend: [], todayShifts: [],
});

const colors = { '人工': '#EA580C', '食材': '#F59E0B', '饮料': '#14B8A6', '房租': '#78716C', '水电': '#0EA5E9', '其他': '#A8A29E',
  'Labor': '#EA580C', 'Food': '#F59E0B', 'Beverage': '#14B8A6', 'Rent': '#78716C', 'Utilities': '#0EA5E9', 'Other': '#A8A29E' };

const maxRevenue = computed(() => {
  if (data.value.trend.length === 0) return 1;
  return Math.max(...data.value.trend.map(d => d.revenue), 1);
});

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const days = locale.value === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return d.getDate() + ' ' + days[d.getDay()];
}

async function fetchData() {
  loading.value = true;
  try {
    const today = new Date().toISOString().split('T')[0];
    const from = dateRange.value?.[0] ? new Date(dateRange.value[0]).toISOString().split('T')[0] : today;
    const to = dateRange.value?.[1] ? new Date(dateRange.value[1]).toISOString().split('T')[0] : today;
    const res = await dashboardAPI.get(from, to);
    data.value = res.data;
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
