<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getItem } from '@/api/posts'
import { createClaim } from '@/api/conversations'
import { useAuth } from '@/stores/auth'
import type { LostItem } from '@/types'
import { formatDate, itemStatusText } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
// 详情数据开始为空，接口返回后再填入物品对象。
const item = ref<LostItem>()
const reason = ref('')
const showClaimForm = ref(false)
const message = ref('')
const loadingError = ref('')
const submittingClaim = ref(false)

// route.params.id 就是地址 /items/:id 中的动态 id。
onMounted(async () => {
  try {
    item.value = await getItem(Number(route.params.id))
  } catch (error) {
    loadingError.value = error instanceof Error ? error.message : '物品详情加载失败'
  }
})

async function submitClaim() {
  // 没有详情数据时不能提交申请。
  if (!item.value) return
  submittingClaim.value = true
  try {
    // 把当前物品和申请理由交给接口。
    await createClaim(item.value, reason.value)
    const claim = await createClaim(item.value, reason.value)
    message.value = '沟通已建立，正在进入会话。'
    showClaimForm.value = false
    reason.value = ''
    await router.push(`/conversations/${claim.id}`)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '提交失败'
  } finally {
    submittingClaim.value = false
  }
}
</script>

<template>
  <!-- 接口返回 item 后才显示详情；否则显示加载提示。 -->
  <div v-if="item" class="detail-layout">
    <img :src="item.imageUrl" :alt="item.title" class="detail-image" />
    <section class="detail-content">
      <span class="type-label" :class="item.type">{{ item.type === 'lost' ? '寻找失物' : '拾获招领' }}</span>
      <h1>{{ item.title }}</h1>
      <p class="detail-description">{{ item.description }}</p>
      <dl class="info-list"><div><dt>地点</dt><dd>{{ item.location }}</dd></div><div v-if="item.supplement"><dt>地点补充</dt><dd>{{ item.supplement }}</dd></div><div><dt>发布时间</dt><dd>{{ formatDate(item.createdAt) }}</dd></div><div><dt>状态</dt><dd>{{ item.isFinished ? '已完成' : itemStatusText(item.status) }}</dd></div><div><dt>发布者</dt><dd>{{ item.publisherName }}</dd></div></dl>
      <!-- 只有别人发布且状态为已发布时，当前用户才能申请认领。 -->
      <button v-if="item.publisherId !== user?.id && item.status === 'approved' && !item.isFinished" class="primary-button" @click="showClaimForm = !showClaimForm">申请认领</button>
      <p v-if="item.publisherId === user?.id" class="muted">这是你发布的信息。</p>
      <p v-if="message" class="success-message">{{ message }}</p>
      <!-- 点击申请认领按钮时切换 showClaimForm，从而显示或隐藏表单。 -->
      <form v-if="showClaimForm" class="claim-form panel" @submit.prevent="submitClaim">
        <label>认领依据<textarea v-model="reason" required maxlength="1000" placeholder="请描述物品的特征，帮助发布者核实"></textarea></label>
        <button class="primary-button" :disabled="submittingClaim">{{ submittingClaim ? '建立沟通中...' : '提交申请' }}</button>
      </form>
    </section>
  </div>
  <div v-else class="empty-state">{{ loadingError || '正在加载物品详情...' }}</div>
</template>
