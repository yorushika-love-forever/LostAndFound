<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getClaimsApi, reviewClaimApi } from '@/api/admin'
import { backendSupport } from '@/admin/config'
import { claimStatusText, formatDate } from '@/admin/format'
import type { AdminClaim, ClaimStatus } from '@/admin/types'

const claims = ref<AdminClaim[]>([])
const status = ref<ClaimStatus | ''>('pending')
const loading = ref(false)
const errorMessage = ref('')

async function loadClaims() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getClaimsApi({
      page: 1,
      page_size: 100,
      status: status.value,
    })
    claims.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function review(claim: AdminClaim, action: 'approve' | 'reject') {
  const actionText = action === 'approve' ? '通过' : '拒绝'

  if (!window.confirm(`确定${actionText}这条认领申请吗？`)) return

  try {
    await reviewClaimApi(claim.id, action)
    await loadClaims()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

onMounted(() => {
  // backendSupport.adminClaims 为 false 时，不发送请求。
  // 这样页面不会因为服务器暂时没有接口而一直报 404。
  if (backendSupport.adminClaims) {
    void loadClaims()
  }
})
</script>

<template>
  <div>
    <h2 class="page-title">认领处理</h2>

    <div v-if="!backendSupport.adminClaims" class="panel">
      <div class="notice-box">
        <strong>后端暂时没有管理端认领列表接口。</strong>
        <p>
          当前学生端使用的是“会话 + 完成申请”，管理员账号看不到全站会话。
          完整管理需要后端提供下面两个接口：
        </p>
        <p><code>GET /api/v1/admin/claims</code></p>
        <p>
          <code>PATCH /api/v1/admin/claims/:id/review</code>
        </p>
        <p>
          后端补好后，把
          <code>src/admin/config.ts</code>
          里的 <code>adminClaims</code> 改成 <code>true</code>。
        </p>
      </div>
    </div>

    <div v-else class="panel">
      <div class="filter-row">
        <select v-model="status" class="select" @change="loadClaims">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p v-if="loading" class="empty-text">正在加载...</p>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>编号</th>
            <th>物品</th>
            <th>申请人</th>
            <th>认领说明</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="claim in claims" :key="claim.id">
            <td>{{ claim.id }}</td>
            <td>{{ claim.post_title || claim.post_id }}</td>
            <td>{{ claim.applicant_name || '-' }}</td>
            <td>{{ claim.description || '-' }}</td>
            <td>{{ claimStatusText(claim.status) }}</td>
            <td>{{ formatDate(claim.created_at) }}</td>
            <td>
              <template v-if="claim.status === 'pending'">
                <button
                  class="button small primary"
                  type="button"
                  @click="review(claim, 'approve')"
                >
                  通过
                </button>
                <button
                  class="button small danger"
                  type="button"
                  @click="review(claim, 'reject')"
                >
                  拒绝
                </button>
              </template>
              <span v-else>已处理</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!loading && claims.length === 0" class="empty-text">
        暂无数据
      </p>
    </div>
  </div>
</template>
