<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const { user, isLoggedIn, logout } = useAuth()

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink to="/home" class="brand">找光 <span>校园失物招领</span></RouterLink>
      <nav v-if="isLoggedIn" class="nav-links">
        <RouterLink to="/home" :class="{ active: route.path === '/home' }">浏览信息</RouterLink>
        <RouterLink to="/publish" :class="{ active: route.path === '/publish' }">发布信息</RouterLink>
        <RouterLink to="/mine" :class="{ active: route.path === '/mine' }">我的记录</RouterLink>
        <RouterLink to="/mine?tab=claims" :class="{ active: route.path === '/mine' && route.query.tab === 'claims' }">消息</RouterLink>
        <RouterLink to="/profile" :class="{ active: route.path === '/profile' }">个人资料</RouterLink>
        <span class="user-name">{{ user?.name }}</span>
        <button class="text-button" @click="handleLogout">退出</button>
      </nav>
    </header>
    <main class="page-container"><slot /></main>
  </div>
</template>
