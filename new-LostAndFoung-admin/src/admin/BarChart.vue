<script setup lang="ts">
import { computed } from 'vue'

interface ChartItem {
  label: string
  value: number
}

const props = defineProps<{
  title: string
  items: ChartItem[]
}>()

const maxValue = computed(() => {
  return Math.max(...props.items.map((item) => item.value), 0)
})

function barWidth(value: number) {
  if (maxValue.value === 0) return '0%'

  return `${Math.round((value / maxValue.value) * 100)}%`
}
</script>

<template>
  <div class="chart-card">
    <h3>{{ title }}</h3>

    <p v-if="items.length === 0" class="empty-text">暂无数据</p>

    <div v-else class="chart-list">
      <div v-for="item in items" :key="item.label" class="chart-item">
        <div class="chart-label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
        <div class="chart-track">
          <div
            class="chart-bar"
            :style="{ width: barWidth(item.value) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
}

h3 {
  margin: 0 0 16px;
  color: #0f172a;
  font-size: 16px;
}

.chart-list {
  display: flex;
  gap: 12px;
  flex-direction: column;
}

.chart-label {
  display: flex;
  margin-bottom: 5px;
  justify-content: space-between;
  color: #475569;
  font-size: 13px;
}

.chart-track {
  overflow: hidden;
  height: 10px;
  border-radius: 5px;
  background: #e2e8f0;
}

.chart-bar {
  height: 100%;
  border-radius: 5px;
  background: #0f766e;
  transition: width 0.25s ease;
}
</style>
