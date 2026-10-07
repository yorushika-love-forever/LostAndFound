/**
 * ConversationView.vue —— 会话详情页（路由 /conversations/:id，:id 即会话编号）
 *
 * 页面作用：展示某条认领会话里的全部消息，支持发送新消息，
 * 并提供“完成寻找申请”的发起与同意/拒绝操作。
 *
 * 依赖接口：getConversationDetail(会话id) 取会话详情（含帖子标题/完成情况快照）、
 *          getMessages(会话id) 取历史消息、sendMessage(会话id, 文本) 发消息、
 *          createFinishRequest 发起完成申请、reviewFinishRequest 处理（同意/拒绝）申请、
 *          withdrawFinishRequest 撤回自己发起的完成申请。
 * 主要交互：进入即拉取会话详情与消息；填写消息并提交；发起/审批/撤回完成申请。
 */
<script setup lang="ts">
// ref 创建响应式状态；onMounted 注册“组件挂载后”的回调（这里用来加载会话详情与消息）。
import { onMounted, ref } from 'vue'
// 只用到 useRoute 读取路由参数 :id，本页没有编程式跳转需求。
import { useRoute } from 'vue-router'
// 会话接口；Message 是 type-only 导入，编译后会被擦除。
import { createFinishRequest, getConversationDetail, getMessages, reviewFinishRequest, sendMessage, withdrawFinishRequest, type Message } from '@/api/conversations'
// Conversation 类型定义在全局 @/types 中（与后端会话结构一一对应）。
import type { Conversation } from '@/types'
// 全局登录态：user 用来判断每条消息是不是“我”发出的。
import { useAuth } from '@/stores/auth'

const route = useRoute()
const { user } = useAuth()
// 会话详情（含帖子快照）。可能为 undefined：接口失败时模板用可选链兜底。
const conversation = ref<Conversation>()
// 消息列表。getMessages 内部已把后端返回的时间倒序翻成正序（见 api/conversations.ts 的 reverse）。
const messages = ref<Message[]>([])
// 输入框内容，配合模板里的 v-model 做双向绑定。
const content = ref('')
// 初值 true：进入页面就要拉消息，先显示加载态。
const loading = ref(true)
const sending = ref(false)
const errorMessage = ref('')
const finishLoading = ref(false)
const finishMessage = ref('')
// 路由参数 :id 是字符串，转成数字再用于接口；非法值（NaN）会在 loadConversation 里被拦截。
const conversationId = Number(route.params.id)

/**
 * 拉取本会话详情与历史消息。
 * 触发方式：组件挂载时（onMounted(loadConversation)）。
 * 若 :id 解析不出有效数字，直接报错并结束加载，避免发出 /conversations/NaN/messages 这种请求。
 * 两个请求互不依赖，用 Promise.all 并发拉取，比串行 await 更快。
 * 成功后分别写入 conversation / messages；失败写入 errorMessage；
 * 无论如何在 finally 关闭 loading（失败时也要关，否则会永远停在“正在加载”）。
 * 注：消息的正序由 getMessages 内部完成 reverse，视图层拿到后直接用即可，无需再处理。
 */
async function loadConversation() {
  if (!conversationId) {
    // NaN 或 0 都属于非法会话编号。
    errorMessage.value = '会话地址无效'
    loading.value = false
    return
  }
  try {
    // 会话详情里带有帖子标题与完成状态快照，聊天页据此展示标题、跳转原帖并决定是否隐藏「申请完成」入口。
    const [detail, messageList] = await Promise.all([getConversationDetail(conversationId), getMessages(conversationId)])
    conversation.value = detail
    messages.value = messageList
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '会话加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 发送一条消息。
 * 触发方式：模板里 <form @submit.prevent="submit"> 的表单提交（回车或点“发送消息”按钮）。
 * 先 trim 去掉首尾空白，空内容或正在发送中就忽略。
 * 成功后把服务端返回的新消息 push 进列表，并清空输入框；失败写入 errorMessage；
 * finally 复位 sending，恢复按钮可用状态。
 */
async function submit() {
  const text = content.value.trim()
  if (!text || sending.value) return
  sending.value = true
  errorMessage.value = ''
  try {
    // sendMessage 返回后端创建好的消息对象，直接追加到末尾（列表本就是正序）。
    messages.value.push(await sendMessage(conversationId, text))
    content.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '消息发送失败'
  } finally {
    sending.value = false
  }
}

/**
 * 发起“完成寻找申请”。
 * 触发方式：点击“申请完成寻找”按钮。
 * 语义：认领沟通达成后，由一方发起完成申请，交给对方确认（见下方 reviewFinish）。
 * 成功后提示“等待对方确认”；失败（如后端判定无权发起、已有待处理申请）写入 finishMessage。
 */
async function requestFinish() {
  if (finishLoading.value) return
  finishLoading.value = true
  finishMessage.value = ''
  try {
    await createFinishRequest(conversationId)
    finishMessage.value = '已发起完成寻找申请，等待对方确认。'
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '无法发起完成申请'
  } finally {
    finishLoading.value = false
  }
}

/**
 * 处理（同意 / 拒绝）一条待办的完成申请。
 * 触发方式：点击“同意完成申请”或“拒绝完成申请”按钮，status 分别为 'agreed' / 'rejected'。
 * 用 window.prompt 让用户填申请编号，并用正则 /^\d+$/ 校验必须是纯数字，否则直接返回。
 * 成功后按 status 给出不同提示（同意会让帖子被标记为完成）；失败写入 finishMessage。
 * 说明：谁能发起、谁能审批由后端按会话双方与申请状态判定，前端这里只负责提交操作与展示结果。
 */
async function reviewFinish(status: 'agreed' | 'rejected') {
  const requestId = window.prompt('请输入待处理的完成申请编号')
  if (!requestId || !/^\d+$/.test(requestId)) return
  finishLoading.value = true
  try {
    await reviewFinishRequest(conversationId, Number(requestId), status)
    finishMessage.value = status === 'agreed' ? '已同意，帖子已标记为完成。' : '已拒绝完成申请。'
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '处理完成申请失败'
  } finally {
    finishLoading.value = false
  }
}

/**
 * 撤回自己发起的“完成寻找申请”。
 * 触发方式：点击“撤回完成申请”按钮。
 * 用 window.prompt 让用户填申请编号（与上面的 reviewFinish 保持一致的交互方式），
 * 并用正则 /^\d+$/ 校验必须是纯数字，否则直接返回。
 * 语义：只有发起方本人、且申请仍是待处理状态才能撤回；撤回后帖子不受影响。
 * 成功后提示已撤回；失败（非发起方 / 申请已被处理）写入 finishMessage。
 */
async function withdrawFinish() {
  const requestId = window.prompt('请输入要撤回的完成申请编号')
  if (!requestId || !/^\d+$/.test(requestId)) return
  finishLoading.value = true
  try {
    await withdrawFinishRequest(conversationId, Number(requestId))
    finishMessage.value = '已撤回该完成寻找申请。'
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '撤回完成申请失败'
  } finally {
    finishLoading.value = false
  }
}

// 挂载后立即加载会话详情与消息（loading 初值为 true，会先显示“正在加载消息...”）。
onMounted(loadConversation)
</script>

<template>
  <!-- 整页根容器；下面 section-heading 是标题栏，含“返回我的记录”路由链接 -->
  <section class="conversation-page">
    <div class="section-heading"><div><p class="eyebrow">CONVERSATION</p><h1>认领沟通</h1></div><RouterLink to="/mine" class="secondary-button">返回我的记录</RouterLink></div>
    <!-- 帖子快照：标题与完成状态由会话详情接口一并返回（后端按 post_id 实时回填），
         因此这里不必再单独调 getItem 去查帖子，点标题可直接跳到原帖。
         postTitle 为空说明帖子已被删除，此时退化成「帖子 #id」并不可点。 -->
    <p v-if="conversation" class="conversation-post">
      <span>关于帖子：</span>
      <RouterLink v-if="conversation.postTitle" :to="`/items/${conversation.postId}`" class="detail-link">{{ conversation.postTitle }}</RouterLink>
      <span v-else class="muted">帖子 #{{ conversation.postId }}（已删除）</span>
      <span v-if="conversation.postIsFinished" class="status-pill">已完成</span>
    </p>
    <div class="panel conversation-panel">
      <!-- 三态渲染：加载中 → 无消息空态 → 消息列表（v-else 里用 v-for 遍历，:key=message.id） -->
      <div v-if="loading" class="empty-state">正在加载消息...</div>
      <div v-else-if="!messages.length" class="empty-state">还没有消息，先介绍一下物品特征吧。</div>
      <div v-else class="message-list">
        <div v-for="message in messages" :key="message.id" class="message-row" :class="{ mine: message.senderId === user?.id }">
          <div class="message-bubble"><p>{{ message.content }}</p><time>{{ new Date(message.createdAt).toLocaleString() }}</time></div>
        </div>
      </div>
      <!-- :class="{ mine: ... }" 给“我发出的消息”加高亮样式；errorMessage / finishMessage 分别提示错误与结果 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="finishMessage" class="success-message">{{ finishMessage }}</p>
      <!-- 完成寻找操作区：申请由一方发起，另一方点同意/拒绝处理，发起方本人可撤回；
           所有按钮在请求中用 finishLoading 禁用，避免并发操作。 -->
      <div class="conversation-actions">
        <!-- 帖子已完成时不再显示「申请完成寻找」：这正是会话详情接口回填 postIsFinished 的用途，
             避免对一个已经完成的帖子反复发起申请。 -->
        <button v-if="!conversation?.postIsFinished" class="secondary-button" :disabled="finishLoading" @click="requestFinish">申请完成寻找</button>
        <button class="secondary-button" :disabled="finishLoading" @click="reviewFinish('agreed')">同意完成申请</button>
        <button class="text-button" :disabled="finishLoading" @click="reviewFinish('rejected')">拒绝完成申请</button>
        <button class="text-button" :disabled="finishLoading" @click="withdrawFinish">撤回完成申请</button>
      </div>
      <!-- 发送消息表单：@submit.prevent 阻止浏览器默认刷新并调用 submit；textarea 用 v-model 双向绑定 content -->
      <form class="message-form" @submit.prevent="submit">
        <textarea v-model="content" maxlength="1000" required placeholder="输入消息"></textarea>
        <button class="primary-button" :disabled="sending">{{ sending ? '发送中...' : '发送消息' }}</button>
      </form>
    </div>
  </section>
</template>
