<!--
  App.vue —— 应用的「根组件」，由 main.ts 通过 createApp(App) 挂载到 index.html 的 #app 上。
  职责只有一个：把「页面外壳（顶部导航 + 内容区）」和「当前路由页面」拼装在一起。
  做法是使用 UserLayout 的默认插槽——UserLayout 负责渲染公共框架（导航栏等），
  并把 <RouterView /> 放进它内部的 <slot /> 处，于是路由匹配到的页面组件就显示在内容区。
  这样布局与页面解耦：每个页面只管自己，不用重复写导航栏。
  依赖：@/layouts/UserLayout.vue。对外：默认导出一个组件（由 SFC 编译器生成）。
-->
<script setup lang="ts">
import UserLayout from '@/layouts/UserLayout.vue'
</script>

<template>
  <!-- RouterView 是「路由出口」：它会根据当前 URL 渲染匹配到的页面组件（如 HomeView）。
       这里把它作为 UserLayout 的默认插槽内容传入。
       RouterView 与 RouterLink 由 vue-router 注册为全局组件（main.ts 里 app.use(router) 生效），
       所以在任何模板里都能直接使用，不需要在每个文件里 import。 -->
  <UserLayout>
    <RouterView />
  </UserLayout>
</template>
