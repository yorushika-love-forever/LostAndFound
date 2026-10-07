<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="panel forbidden-box">
    <h2>没有权限</h2>
    <p>当前管理员不能访问这个页面。</p>
    <button
      class="button primary"
      type="button"
      @click="router.push('/admin/dashboard')"
    >
      返回数据总览
    </button>
  </div>
</template>
