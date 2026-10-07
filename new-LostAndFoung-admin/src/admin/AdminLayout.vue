<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogout, getAdminUser } from '@/admin/auth'
import { roleText } from '@/admin/format'
import '@/admin/style.css'
import type { UserRole } from '@/admin/types'

interface MenuItem {
  path: string
  text: string
  roles?: UserRole[]
}

const router = useRouter()
const currentUser = getAdminUser()

const menus: MenuItem[] = [
  { path: '/admin/dashboard', text: '数据总览' },
  { path: '/admin/posts', text: '帖子审核' },
  { path: '/admin/items', text: '物品状态' },
  { path: '/admin/comments', text: '评论管理' },
  { path: '/admin/deleted-posts', text: '已删除帖子' },
  {
    path: '/admin/announcements',
    text: '公告管理',
  },
  {
    path: '/admin/users',
    text: '用户管理',
    roles: ['mainadmin'],
  },
  {
    path: '/admin/feedbacks',
    text: '意见反馈',
    roles: ['mainadmin'],
  },
  {
    path: '/admin/appeals',
    text: '申诉审核',
    roles: ['mainadmin'],
  },
]

const visibleMenus = computed(() => {
  return menus.filter((menu) => {
    if (!menu.roles) return true
    return currentUser ? menu.roles.includes(currentUser.role) : false
  })
})

function logout() {
  adminLogout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <strong>校园失物招领</strong>
        <span>管理端</span>
      </div>

      <nav class="admin-nav">
        <router-link
          v-for="menu in visibleMenus"
          :key="menu.path"
          :to="menu.path"
        >
          {{ menu.text }}
        </router-link>
      </nav>
    </aside>

    <div class="admin-right">
      <header class="admin-header">
        <div class="admin-header-info">
          <strong>{{ currentUser?.name || currentUser?.username || '管理员' }}</strong>
          <span>{{ currentUser ? roleText(currentUser.role) : '' }}</span>
        </div>

        <button class="button" type="button" @click="logout">
          退出登录
        </button>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>
