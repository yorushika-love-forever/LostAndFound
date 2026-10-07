<!--
  UserLayout.vue —— 学生端的「页面外壳 / 布局组件」。
  它渲染所有页面共用的顶部导航栏，并在内容区留出一个默认插槽 <slot />。
  被谁用：App.vue 把 <RouterView /> 作为插槽内容传进来，于是「当前路由页面」就渲染在这里。
  配合关系：导航栏由本组件固定渲染、只写一次；内容随路由切换——这就是「布局 + 路由页面」分离。
  依赖：vue-router 的 useRoute/useRouter、@/stores/auth 的 useAuth（顶栏样式来自全局 user.css）。
  对外：默认导出组件；通过默认插槽向父组件提供内容区的占位位置。
-->
<script setup lang="ts">
// useRoute() 取「当前路由对象」，用于读取 path、query 等（只读）；
// useRouter() 取「路由实例」，用于主动导航（如 push）。二者分工：route 读、router 写。
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

// 从全局 store 取出当前用户、是否已登录、登出方法。
// useAuth() 返回的 user / isLoggedIn 与全局状态指向同一份数据，登录态变化时这里会自动更新。
const route = useRoute()
const router = useRouter()
const { user, isLoggedIn, logout } = useAuth()

/**
 * 退出登录：先清理登录态（内存 + localStorage），再跳转到登录页。
 * 顺序很重要——先 logout 使 isLoggedIn 变为 false，顶栏的登录专属导航会立即隐藏，
 * 随后 push('/login') 完成页面跳转；若反过来可能一瞬间仍显示已登录的导航。
 */
function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <!-- app-shell 是整页最外层容器，负责「顶栏 + 内容区」的整体布局。 -->
  <div class="app-shell">
    <header class="topbar">
      <!-- RouterLink 是路由链接组件：点击后交给前端路由切换，不会刷新整个页面。
           to="/home" 指定目标地址，相当于把 <a> 的 href 交给路由统一处理。 -->
      <RouterLink to="/home" class="brand">找光 <span>校园失物招领</span></RouterLink>
      <!-- v-if 是条件渲染：只有已登录时才显示这排导航；未登录时该 <nav> 根本不会出现在 DOM 中。 -->
      <nav v-if="isLoggedIn" class="nav-links">
        <!-- :class 绑定一个对象：键是类名、值是布尔，为真时加上 active 类来高亮当前项。
             这里直接比较 route.path 而不用额外状态，简单直观。 -->
        <RouterLink to="/home" :class="{ active: route.path === '/home' }">浏览信息</RouterLink>
        <RouterLink to="/publish" :class="{ active: route.path === '/publish' }">发布信息</RouterLink>
        <RouterLink to="/mine" :class="{ active: route.path === '/mine' }">我的记录</RouterLink>
        <!-- 「消息」与「我的记录」都指向 /mine，靠 query 的 tab=claims 加以区分。
             所以高亮时要同时判断 path 和 query.tab，才能只让其中一项点亮。 -->
        <RouterLink to="/mine?tab=claims" :class="{ active: route.path === '/mine' && route.query.tab === 'claims' }">消息</RouterLink>
        <RouterLink to="/profile" :class="{ active: route.path === '/profile' }">个人资料</RouterLink>
        <!-- {{ }} 是插值，把用户名渲染成文本；user?.name 使用可选链，
             即使 user 暂时为空也不会报错，只会渲染成空白。 -->
        <span class="user-name">{{ user?.name }}</span>
        <!-- @click 绑定点击事件：点击后调用 handleLogout 完成退出并跳转。 -->
        <button class="text-button" @click="handleLogout">退出</button>
      </nav>
    </header>
    <!-- <slot /> 是「默认插槽」的出口：父组件 App.vue 把 <RouterView /> 写在 <UserLayout> 标签之间传入，
         Vue 会把它渲染到这个 <slot /> 所在位置。这正是「导航栏不变、内容随路由切换」的实现方式。 -->
    <main class="page-container"><slot /></main>
  </div>
</template>
