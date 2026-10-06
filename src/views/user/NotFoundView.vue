<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const { isLoggedIn } = useAuth()

function goBack() {
  router.push(isLoggedIn.value ? '/home' : '/login')
}
</script>

<template>
  <section class="auth-layout">
    <div class="auth-intro"><p class="eyebrow">404 NOT FOUND</p><h1>这个页面<br /><em>也走丢了。</em></h1><p>你访问的地址不存在，或者对应的内容已经被移除。</p></div>
    <div class="panel auth-form">
      <p class="eyebrow">LOST & FOUND</p><h2>页面不存在</h2>
      <p class="page-lead">请检查地址是否正确：{{ route.fullPath }}</p>
      <button class="primary-button" @click="goBack">{{ isLoggedIn ? '返回首页' : '去登录' }}</button>
    </div>
  </section>
</template>
