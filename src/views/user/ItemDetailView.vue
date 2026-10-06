<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createClaim } from '@/api/conversations'
import { createComment, deleteComment, getComments } from '@/api/comments'
import { getItem } from '@/api/posts'
import { useAuth } from '@/stores/auth'
import type { Comment, LostItem } from '@/types'
import { formatDate, itemStatusText } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const item = ref<LostItem>()
const comments = ref<Comment[]>([])
const reason = ref('')
const commentText = ref('')
const showClaimForm = ref(false)
const loadingError = ref('')
const message = ref('')
const commentError = ref('')
const loading = ref(true)
const commentsLoading = ref(false)
const submittingClaim = ref(false)
const submittingComment = ref(false)
const deletingCommentId = ref<number | null>(null)
const itemId = Number(route.params.id)

onMounted(async () => {
  try {
    item.value = await getItem(itemId)
    commentsLoading.value = true
    comments.value = await getComments(itemId)
  } catch (error) {
    loadingError.value = error instanceof Error ? error.message : '物品详情加载失败'
  } finally {
    loading.value = false
    commentsLoading.value = false
  }
})

async function submitClaim() {
  if (!item.value || submittingClaim.value) return
  submittingClaim.value = true
  message.value = ''
  try {
    const conversation = await createClaim(item.value, reason.value)
    await router.push(`/conversations/${conversation.id}`)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '提交失败'
  } finally {
    submittingClaim.value = false
  }
}

async function submitComment() {
  const content = commentText.value.trim()
  if (!content || submittingComment.value) return
  submittingComment.value = true
  commentError.value = ''
  try {
    comments.value.unshift(await createComment(itemId, content))
    commentText.value = ''
  } catch (error) {
    commentError.value = error instanceof Error ? error.message : '评论发表失败'
  } finally {
    submittingComment.value = false
  }
}

async function removeComment(id: number) {
  if (!window.confirm('确定删除这条评论吗？')) return
  deletingCommentId.value = id
  try {
    await deleteComment(id)
    comments.value = comments.value.filter((comment) => comment.id !== id)
  } catch (error) {
    commentError.value = error instanceof Error ? error.message : '评论删除失败'
  } finally {
    deletingCommentId.value = null
  }
}
</script>

<template>
  <div v-if="item" class="detail-layout">
    <img :src="item.imageUrl" :alt="item.title" class="detail-image" />
    <section class="detail-content">
      <span class="type-label" :class="item.type">{{ item.type === 'lost' ? '寻找失物' : '拾获招领' }}</span>
      <h1>{{ item.title }}</h1>
      <p class="detail-description">{{ item.description }}</p>
      <dl class="info-list">
        <div><dt>地点</dt><dd>{{ item.location }}</dd></div>
        <div v-if="item.supplement"><dt>地点补充</dt><dd>{{ item.supplement }}</dd></div>
        <div><dt>发布时间</dt><dd>{{ formatDate(item.createdAt) }}</dd></div>
        <div><dt>状态</dt><dd>{{ item.isFinished ? '已完成' : itemStatusText(item.status) }}</dd></div>
        <div><dt>发布者</dt><dd>用户 {{ item.publisherId }}</dd></div>
      </dl>
      <button v-if="item.publisherId !== user?.id && item.status === 'approved' && !item.isFinished" class="primary-button" @click="showClaimForm = !showClaimForm">申请认领 / 召领</button>
      <p v-if="item.publisherId === user?.id" class="muted">这是你发布的信息。</p>
      <p v-if="message" class="success-message">{{ message }}</p>
      <form v-if="showClaimForm" class="claim-form panel" @submit.prevent="submitClaim">
        <label>认领依据<textarea v-model="reason" required maxlength="1000" placeholder="描述物品特征，帮助发布者核实"></textarea></label>
        <button class="primary-button" :disabled="submittingClaim">{{ submittingClaim ? '建立沟通中...' : '提交申请' }}</button>
      </form>
    </section>
  </div>
  <div v-else-if="loading" class="empty-state">正在加载物品详情...</div>
  <div v-else class="empty-state">{{ loadingError || '物品不存在或暂不可见' }}</div>

  <section v-if="item" class="comments-section">
    <div class="section-heading"><div><p class="eyebrow">COMMENTS</p><h2>留言</h2></div><span class="result-count">{{ comments.length }} 条</span></div>
    <form class="panel comment-form" @submit.prevent="submitComment">
      <textarea v-model="commentText" maxlength="1000" required placeholder="补充线索或礼貌留言"></textarea>
      <div class="form-actions"><button class="primary-button" :disabled="submittingComment">{{ submittingComment ? '发表中...' : '发表评论' }}</button></div>
    </form>
    <p v-if="commentError" class="error-message">{{ commentError }}</p>
    <div v-if="commentsLoading" class="empty-state">正在加载留言...</div>
    <div v-else-if="comments.length" class="comment-list">
      <article v-for="comment in comments" :key="comment.id" class="comment-row">
        <div><strong>用户 {{ comment.userId }}</strong><time>{{ formatDate(comment.createdAt) }}</time><p>{{ comment.content }}</p></div>
        <button v-if="comment.userId === user?.id" class="text-button" :disabled="deletingCommentId === comment.id" @click="removeComment(comment.id)">删除</button>
      </article>
    </div>
    <div v-else class="empty-state">还没有留言，来留下第一条线索吧。</div>
  </section>
</template>
