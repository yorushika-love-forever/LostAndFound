<script setup lang="ts">
import type { LostItem } from '@/types'
import { itemStatusText } from '@/utils/format'

// defineProps 声明父组件传进来的数据。
// 这里要求父组件必须传入一个名为 item、类型为 LostItem 的对象。
defineProps<{ item: LostItem }>()

// 根据物品类型返回用户看得懂的中文文字。
const typeText = (type: LostItem['type']) => type === 'lost' ? '我丢失的' : '我捡到的'
</script>

<template>
  <!-- article 表示一张独立的物品卡片。 -->
  <article class="item-card">
    <!-- :src 和 :alt 前面的冒号表示“绑定 JavaScript 数据”。 -->
    <img :src="item.imageUrl" :alt="item.title" class="item-image" />
    <div class="item-body">
      <div class="item-heading">
        <!-- :class 会把 item.type 的值添加成 CSS 类名，用来区分颜色。 -->
        <span class="type-label" :class="item.type">{{ typeText(item.type) }}</span>
        <span class="status">{{ item.isFinished ? '已完成' : itemStatusText(item.status) }}</span>
      </div>
      <!-- {{ }} 是 Vue 插值语法，用来把数据放到 HTML 文本中。 -->
      <h3>{{ item.title }}</h3>
      <p class="muted">{{ item.location }}<span v-if="item.supplement"> · {{ item.supplement }}</span></p>
      <p class="description">{{ item.description }}</p>
      <RouterLink class="detail-link" :to="`/items/${item.id}`">查看详情 →</RouterLink>
    </div>
  </article>
</template>
