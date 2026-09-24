import{createRouter,createWebHistory}from 'vue-router'
import LoginView from '@/user/LoginView.vue'
const routes = [
    {
        path: '/',
        name: 'login',
        component: LoginView,
    },
    {
        path: '/home',
        name: 'home',
        component: () => import('@/user/HomeView.vue'),
    },
]
const router = createRouter({history:createWebHistory(), routes})
export default router