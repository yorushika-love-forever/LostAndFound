<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getItems } from '@/api/posts'
import ItemCard from '@/components/user/ItemCard.vue'
import type { ItemQuery, LostItem } from '@/types'

// ref 创建响应式数组；接口返回新数据后，使用 items.value 赋值即可刷新页面。
const items = ref<LostItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
// reactive 管理多个筛选条件，输入框改变时 query 会同步改变。
const query = reactive<ItemQuery>({ keyword: '', type: '', location: '', finished: false })

async function loadItems() {
  // 请求开始时显示加载文字。
  loading.value = true
  errorMessage.value = ''
  try {
    items.value = await getItems(query)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '信息加载失败'
  } finally {
    loading.value = false
  }
}

// onMounted 会在组件第一次显示到页面后执行一次，适合首次加载数据。
onMounted(loadItems)
</script>

<template>
  <section class="hero-section">
    <div>
      <p class="eyebrow">MAKE THE CAMPUS KINDER</p>
      <h1>你在寻找什么？</h1>
      <p class="hero-subtitle">一条线索，可能就是失主找回重要物品的开始。</p>
    </div>
    <!-- 点击 RouterLink 会跳到发布页面，不会刷新浏览器。 -->
    <RouterLink to="/publish" class="primary-button">发布一条信息 <span>＋</span></RouterLink>
  </section>

  <section class="toolbar panel">
    <!-- @keyup.enter 表示用户在输入框按回车时执行搜索。 -->
    <!-- 占位文案只承诺"名称"：后端 keyword 只对 title 做模糊匹配，描述和地点搜不到。 -->
    <input v-model="query.keyword" placeholder="搜索物品名称" @keyup.enter="loadItems" />
    <input v-model="query.location" placeholder="按地点筛选" @keyup.enter="loadItems" />
    <select v-model="query.type" @change="loadItems">
      <option value="">全部类型</option><option value="lost">寻找失物</option><option value="found">发布招领</option>
    </select>
    <select v-model="query.finished" @change="loadItems">
      <option :value="false">未完成</option>
      <option :value="true">已完成</option>
      <option :value="undefined">全部状态</option>
    </select>
    <button class="secondary-button" @click="loadItems">搜索</button>
  </section>

  <section class="section-heading">
    <div><p class="eyebrow">LATEST UPDATES</p><h2>最新信息</h2></div>
    <span class="result-count">共 {{ items.length }} 条</span>
  </section>
  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  <!-- 三种页面状态：加载中、有数据、没有数据。 -->
  <div v-if="loading" class="empty-state">正在寻找相关信息...</div>
  <div v-else-if="items.length" class="item-grid">
    <!-- 每一条物品都复用 ItemCard，并把当前 item 作为 prop 传进去。 -->
    <ItemCard v-for="item in items" :key="item.id" :item="item" />
  </div>
  <div v-else class="empty-state">暂时没有匹配的信息，换个关键词试试。</div>
</template>
