<script setup lang="ts">
import { ref } from 'vue'
import {
  deleteUserApi,
  recoverUserApi,
} from '@/api/admin'

const userId = ref('')
const loading = ref(false)

async function deactivateUser() {
  if (!userId.value.trim()) {
    window.alert('请输入用户编号')
    return
  }

  if (!window.confirm(`确定注销用户 ${userId.value} 吗？`)) return

  loading.value = true

  try {
    await deleteUserApi(userId.value.trim())
    window.alert('用户已注销')
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '注销失败')
  } finally {
    loading.value = false
  }
}

async function recoverUser() {
  if (!userId.value.trim()) {
    window.alert('请输入用户编号')
    return
  }

  if (!window.confirm(`确定恢复用户 ${userId.value} 吗？`)) return

  loading.value = true

  try {
    await recoverUserApi(userId.value.trim())
    window.alert('用户已恢复')
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '恢复失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="page-title">用户管理</h2>

    <div class="panel">
      <div class="notice-box">
        系统管理员目前根据用户编号注销或恢复用户。
      </div>
<!-- 当前后端没有用户列表、修改角色和启用/禁用接口。
        系统管理员目前只能根据用户编号注销或恢复用户。 -->

      <div class="form-item user-id-form">
        <label>用户编号</label>
        <input
          v-model="userId"
          class="input"
          inputmode="numeric"
          placeholder="请输入用户 id"
        />
      </div>

      <div class="form-actions">
        <button
          class="button danger"
          type="button"
          :disabled="loading"
          @click="deactivateUser"
        >
          注销用户
        </button>
        <button
          class="button primary"
          type="button"
          :disabled="loading"
          @click="recoverUser"
        >
          恢复用户
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-id-form {
  margin-top: 18px;
}

.form-actions {
  display: flex;
  gap: 10px;
}
</style>
