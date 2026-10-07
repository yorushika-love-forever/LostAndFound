import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/admin/AdminLayout.vue'
import {
  adminLogout,
  getAdminToken,
  getAdminUser,
  refreshAdminUser,
} from '@/admin/auth'
import type { UserRole } from '@/admin/types'

declare module 'vue-router' {
  interface RouteMeta {
    roles?: UserRole[]
    adminPublic?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/admin/login',
    },
    {
      path: '/admin/login',
      component: () => import('@/admin/LoginView.vue'),
      meta: { adminPublic: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          component: () => import('@/admin/DashboardView.vue'),
        },
        {
          path: 'posts',
          component: () => import('@/admin/PostReviewView.vue'),
        },
        {
          path: 'items',
          component: () => import('@/admin/ItemManageView.vue'),
        },
        {
          path: 'comments',
          component: () => import('@/admin/CommentManageView.vue'),
        },
        {
          path: 'deleted-posts',
          component: () => import('@/admin/DeletedPostView.vue'),
        },
        {
          path: 'claims',
          component: () => import('@/admin/ClaimManageView.vue'),
        },
        {
          path: 'announcements',
          component: () => import('@/admin/AnnouncementManageView.vue'),
          meta: { roles: ['mainadmin'] },
        },
        {
          path: 'users',
          component: () => import('@/admin/UserManageView.vue'),
          meta: { roles: ['mainadmin'] },
        },
        {
          path: 'feedbacks',
          component: () => import('@/admin/FeedbackManageView.vue'),
          meta: { roles: ['mainadmin'] },
        },
        {
          path: 'forbidden',
          component: () => import('@/admin/ForbiddenView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  if (!to.path.startsWith('/admin')) {
    return true
  }

  const token = getAdminToken()
  let user = getAdminUser()

  if (to.meta.adminPublic) {
    return token && user ? '/admin/dashboard' : true
  }

  if (!token) {
    return {
      path: '/admin/login',
      query: { redirect: to.fullPath },
    }
  }

  if (!user) {
    try {
      user = await refreshAdminUser()
    } catch {
      adminLogout()
      return {
        path: '/admin/login',
        query: { redirect: to.fullPath },
      }
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(user.role)) {
    return '/admin/forbidden'
  }

  return true
})

export default router
