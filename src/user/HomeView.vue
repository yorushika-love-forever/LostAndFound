<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getItems } from '@/api/posts'
import ItemCard from '@/components/ItemCard.vue'
import type { ItemQuery, LostItem } from '@/types'

const items = ref<LostItem[]>([])
const loading = ref(false)
const errorMessage = ref('')

const query = reactive<ItemQuery>({
  keyword: '',
  type: '',
  location: '',
  finished: false,
})

async function loadItems() {
  loading.value = true
  errorMessage.value = ''

  try {
    items.value = await getItems(query)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '信息加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)
</script>

<template>
  <section class="hero-section">
    <h1>校园失物招领</h1>
    <RouterLink to="/publish" class="primary-button">
      发布信息
    </RouterLink>
  </section>

  <section class="toolbar panel">
    <input
      v-model="query.keyword"
      placeholder="搜索物品、地点或描述"
      @keyup.enter="loadItems"
    />

    <select v-model="query.type" @change="loadItems">
      <option value="">全部类型</option>
      <option value="lost">失物</option>
      <option value="found">招领</option>
    </select>

    <select v-model="query.finished" @change="loadItems">
      <option :value="false">未完成</option>
      <option :value="true">已完成</option>
      <option :value="undefined">全部状态</option>
    </select>

    <button class="secondary-button" @click="loadItems">
      搜索
    </button>
  </section>

  <p v-if="errorMessage" class="error-message">
    {{ errorMessage }}
  </p>

  <div v-if="loading" class="empty-state">
    正在加载...
  </div>

  <div v-else-if="items.length" class="item-grid">
    <ItemCard
      v-for="item in items"
      :key="item.id"
      :item="item"
    />
  </div>

  <div v-else class="empty-state">
    暂时没有匹配的信息
  </div>
</template>