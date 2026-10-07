<!--
  全站公告页（路由：`/announcements`）。
  作用：展示管理员发布的平台公告，按发布时间倒序（后端已排序）逐条列出。
  读取接口：getAnnouncements()（`GET /announcements`，公开接口，未登录也能查看）。
  主要交互：无写入操作，纯展示；加载中 / 加载失败 / 空列表三种状态分别给出提示。
-->
<script setup lang="ts">
// onMounted 注册「挂载后」回调，ref 创建响应式数据。
import { onMounted, ref } from 'vue'
import { getAnnouncements } from '@/api/announcements'
import type { Announcement } from '@/types'
import { formatDate } from '@/utils/format'

// 公告列表；初始为空数组，模板用 v-if/v-else 区分「加载中 / 有数据 / 空」。
const announcements = ref<Announcement[]>([])
// loading 初值为 true：请求回来前先显示占位，而不是误报「暂无公告」。
const loading = ref(true)
// 加载失败时的提示文案。
const errorMessage = ref('')

/**
 * 页面挂载时拉取公告列表。
 * 触发时机：进入本页时执行一次（onMounted）。
 * 成功：写入 announcements。
 * 失败：写入 errorMessage；finally 里无论如何都关掉 loading，
 *      否则请求失败会永远停在「正在加载公告...」。
 */
onMounted(async () => {
  try {
    announcements.value = await getAnnouncements()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '公告加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- 页面头部：标题与说明，样式复用全局的 section-heading -->
  <section class="section-heading"><div><p class="eyebrow">NOTICE BOARD</p><h1>全站公告</h1><p class="page-lead">来自平台管理员的通知与使用说明。</p></div></section>
  <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  <!-- 加载中占位 -->
  <div v-if="loading" class="empty-state">正在加载公告...</div>
  <!-- 有公告：v-for 遍历渲染，:key 用公告 id 帮助 Vue 精确复用节点 -->
  <div v-else-if="announcements.length" class="announcement-list">
    <article v-for="announcement in announcements" :key="announcement.id" class="announcement-card panel">
      <h2>{{ announcement.title }}</h2>
      <!-- 作者姓名可能缺失（历史公告没有回填），用 || 兜底成「管理员」 -->
      <p class="muted">{{ announcement.authorName || '管理员' }} · {{ formatDate(announcement.createdAt) }}</p>
      <!-- announcement-content 用 white-space: pre-wrap 保留后端正文里的换行 -->
      <p class="announcement-content">{{ announcement.content }}</p>
    </article>
  </div>
  <!-- 加载完成但没有任何公告 -->
  <div v-else class="empty-state">暂时还没有公告。</div>
</template>
