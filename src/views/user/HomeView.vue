<!--
  首页 / 信息列表页（路由：`/home`，访问根路径 `/` 也会重定向到这里，见 router/index.ts）。
  作用：以卡片网格展示校园失物 / 招领信息，并支持关键字、地点、类型、状态四类筛选。
  数据来源：`@/api/posts` 的 getItems(query)，内部调用后端 `GET /posts`（分页 + 仅对 title 模糊搜索），
  再在前端按 location 字段二次过滤；发布入口跳转到 `/publish`。
  主要交互：输入框回车或点「搜索」按钮触发 loadItems()；下拉框改变即重新查询。
-->
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getItems } from '@/api/posts'
import ItemCard from '@/components/user/ItemCard.vue'
import type { ItemQuery, LostItem } from '@/types'

// ref 创建响应式数组；接口返回新数据后，使用 items.value 赋值即可刷新页面。
const items = ref<LostItem[]>([])
// loading 控制「加载中」占位；ref 包裹的原始值在脚本里要写 .value，模板里会自动解包。
const loading = ref(false)
// errorMessage 存后端返回的错误文案（响应信封的 msg），用于页面顶部提示。
const errorMessage = ref('')
// reactive 管理多个筛选条件，输入框改变时 query 会同步改变。
// 这里用 reactive 而非多个 ref：模板中 v-model="query.keyword" 可直接双向绑定，无需写 .value。
const query = reactive<ItemQuery>({ keyword: '', type: '', location: '', finished: false })

/**
 * 拉取物品列表。
 * 触发时机：首次挂载（onMounted）、点「搜索」按钮、输入框回车、任意下拉框 change。
 * 调用接口：getItems(query) → 后端 `GET /posts`（带 keyword/type/finished 参数，并逐页取全）。
 * 设计取舍：筛选条件变化时重新请求后端，而不是在前端过滤已有数组，
 *          这样数据量增大或别处新增信息后，结果依然准确。
 * 成功：把返回数组赋给 items，视图自动刷新。
 * 失败：把错误信息写进 errorMessage 提示用户；无论成败都在 finally 关闭 loading。
 */
async function loadItems() {
  // 请求开始时显示加载文字。
  loading.value = true
  errorMessage.value = ''
  try {
    items.value = await getItems(query)
  } catch (error) {
    // error 类型不确定（可能是 Error 也可能是别的），运行时判断后再取 message。
    errorMessage.value = error instanceof Error ? error.message : '信息加载失败'
  } finally {
    loading.value = false
  }
}

// onMounted 会在组件第一次显示到页面后执行一次，适合首次加载数据。
// 这里直接传函数引用：仅首次执行；之后筛选变更由模板事件再次调用 loadItems。
onMounted(loadItems)
</script>

<template>
  <!-- 顶部 Hero 区：标语 + 发布入口 -->
  <section class="hero-section">
    <div>
      <p class="eyebrow">MAKE THE CAMPUS KINDER</p>
      <h1>你在寻找什么？</h1>
      <p class="hero-subtitle">一条线索，可能就是失主找回重要物品的开始。</p>
    </div>
    <!-- 点击 RouterLink 会跳到发布页面，不会刷新浏览器。 -->
    <RouterLink to="/publish" class="primary-button">发布一条信息 <span>＋</span></RouterLink>
  </section>

  <!-- 筛选工具栏：所有控件都双向绑定到 query，改动后调用 loadItems 重新请求后端 -->
  <section class="toolbar panel">
    <!-- @keyup.enter 表示用户在输入框按回车时执行搜索。 -->
    <!-- 占位文案只承诺"名称"：后端 keyword 只对 title 做模糊匹配，描述和地点搜不到。 -->
    <input v-model="query.keyword" placeholder="搜索物品名称" @keyup.enter="loadItems" />
    <!-- 地点没有对应的后端参数，仍由 getItems 内部按 location 字段过滤；同样支持回车查询。 -->
    <input v-model="query.location" placeholder="按地点筛选" @keyup.enter="loadItems" />
    <!-- 下拉框选中后立即（@change）重新查询，不必再点按钮，交互更直接。 -->
    <select v-model="query.type" @change="loadItems">
      <option value="">全部类型</option><option value="lost">寻找失物</option><option value="found">发布招领</option>
    </select>
    <!-- :value="false" 让选项绑定布尔值而非字符串 "false"，与 ItemQuery.finished 类型一致；
         第三项 value=undefined 表示「不传该参数」，后端即返回全部状态。 -->
    <select v-model="query.finished" @change="loadItems">
      <option :value="false">未完成</option>
      <option :value="true">已完成</option>
      <option :value="undefined">全部状态</option>
    </select>
    <!-- 手动触发一次搜索，方便不用键盘回车的用户。 -->
    <button class="secondary-button" @click="loadItems">搜索</button>
  </section>

  <!-- 区块标题 + 结果条数（items.length 是响应式的，会随数据变化更新） -->
  <section class="section-heading">
    <div><p class="eyebrow">LATEST UPDATES</p><h2>最新信息</h2></div>
    <span class="result-count">共 {{ items.length }} 条</span>
  </section>
  <!-- 只有存在错误时才渲染，v-if 会直接在 DOM 中增删该节点 -->
  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  <!-- 三种页面状态：加载中、有数据、没有数据。 -->
  <div v-if="loading" class="empty-state">正在寻找相关信息...</div>
  <div v-else-if="items.length" class="item-grid">
    <!-- 每一条物品都复用 ItemCard，并把当前 item 作为 prop 传进去。 -->
    <!-- :key 用 item.id 而非数组下标：列表会因筛选变化重排，用稳定 id 才能让 Vue 正确复用节点。 -->
    <ItemCard v-for="item in items" :key="item.id" :item="item" />
  </div>
  <!-- v-else：既不加载、也没有数据时展示空状态 -->
  <div v-else class="empty-state">暂时没有匹配的信息，换个关键词试试。</div>
</template>
