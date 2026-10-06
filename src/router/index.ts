import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'

// createRouter 用来创建整个项目的路由管理器。
const router = createRouter({
  // createWebHistory 使用正常的 URL，例如 /home、/items/1。
  // 部署到服务器时需要服务器把这些路径都指向 index.html。
  history: createWebHistory(),//路由器的工作模式
  routes: [
    // redirect 表示访问根路径 / 时，自动跳到首页。
    { path: '/', redirect: '/home' },
    // import() 是动态导入：只有用户访问这个页面时，才加载对应的组件。
    { path: '/login', 
      component: () => import('@/views/user/LoginView.vue') },
    { path: '/register', 
      component: () => import('@/views/user/RegisterView.vue') },
    { path: '/appeal', 
      component: () => import('@/views/user/AppealView.vue') },
    // meta 是路由附加信息。requiresAuth 用来标记“这个页面必须登录”。
    { path: '/home', 
      component: () => import('@/views/user/HomeView.vue'), meta: { requiresAuth: true } },
    { path: '/items/:id', 
      component: () => import('@/views/user/ItemDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/publish', 
      component: () => import('@/views/user/PublishView.vue'), meta: { requiresAuth: true } },
    { path: '/mine', 
      component: () => import('@/views/user/MyView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', 
      component: () => import('@/views/user/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/conversations/:id', 
      component: () => import('@/views/user/ConversationView.vue'), meta: { requiresAuth: true } },
  ],
})

// 路由守卫会在每次页面跳转前执行，常用于检查登录权限。
router.beforeEach((to) => {
  const { isLoggedIn } = useAuth()
  // to 是即将进入的路由；to.meta.requiresAuth 是上面设置的标记。
  if (to.meta.requiresAuth && !isLoggedIn.value) return '/login'
  // 已经登录的用户再次访问登录页时，直接送回首页。
  if (to.path === '/login' && isLoggedIn.value) return '/home'
})





export default router
