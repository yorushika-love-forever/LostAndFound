<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  deleteUserApi,
  getUsersApi,
  updateUserRoleApi,
  updateUserStatusApi,
} from '@/api/admin'
import { backendSupport } from '@/admin/config'
import type { AdminUser, UserRole } from '@/admin/types'

const users = ref<AdminUser[]>([])
const keyword = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getUsersApi({
      page: 1,
      page_size: 100,
      keyword: keyword.value,
    })
    users.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function changeRole(user: AdminUser, role: UserRole) {
  try {
    await updateUserRoleApi(user.id, role)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '修改角色失败')
    await loadUsers()
  }
}

async function toggleStatus(user: AdminUser) {
  const nextStatus = user.status === 'disabled' ? 'active' : 'disabled'

  try {
    await updateUserStatusApi(user.id, nextStatus)
    await loadUsers()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '修改状态失败')
  }
}

async function removeUser(user: AdminUser) {
  if (!window.confirm(`确定注销用户“${user.username}”吗？`)) return

  try {
    await deleteUserApi(user.id)
    await loadUsers()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '注销失败')
  }
}

onMounted(() => {
  if (backendSupport.adminUsers) {
    void loadUsers()
  }
})
</script>

<template>
  <div>
    <h2 class="page-title">用户管理</h2>

    <div v-if="!backendSupport.adminUsers" class="panel">
      <div class="notice-box">
        <strong>当前服务器还没有用户管理接口。</strong>
        <p>
          现在只有注销用户的
          <code>DELETE /api/v1/admin/users/:id</code>，
          没有用户列表、启用/禁用和修改角色接口。
        </p>
        <p>
          后端补好后，把
          <code>src/admin/config.ts</code>
          里的 <code>adminUsers</code> 改成 <code>true</code>。
        </p>
      </div>
    </div>

    <div v-else class="panel">
      <div class="filter-row">
        <input
          v-model="keyword"
          class="input"
          placeholder="搜索用户名、姓名或学号"
          @keyup.enter="loadUsers"
        />
        <button class="button primary" type="button" @click="loadUsers">
          查询
        </button>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>用户名</th>
            <th>姓名</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.username }}</td>
            <td>{{ user.name || user.nickname || '-' }}</td>
            <td>
              <select
                v-model="user.role"
                class="select"
                @change="changeRole(user, user.role)"
              >
                <option value="student">学生</option>
                <option value="postadmin">失物招领管理员</option>
                <option value="mainadmin">系统管理员</option>
              </select>
            </td>
            <td>{{ user.status === 'disabled' ? '已禁用' : '正常' }}</td>
            <td>
              <button
                class="button small"
                type="button"
                @click="toggleStatus(user)"
              >
                {{ user.status === 'disabled' ? '启用' : '禁用' }}
              </button>
              <button
                class="button small danger"
                type="button"
                @click="removeUser(user)"
              >
                注销
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && users.length === 0" class="empty-text">
        暂无用户
      </p>
    </div>
  </div>
</template>
