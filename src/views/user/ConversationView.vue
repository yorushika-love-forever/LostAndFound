/**
 * ConversationView.vue —— 会话详情页（路由 /conversations/:id，:id 即会话编号）
 *
 * 页面作用：展示某条认领会话里的全部消息，支持发送新消息，
 * 并提供“完成寻找申请”的发起与同意/拒绝操作。
 *
 * 依赖接口：getConversationDetail(会话id) 取会话详情（含帖子标题/完成情况快照）、
 *          getMessages(会话id) 取历史消息、sendMessage(会话id, 文本) 发消息、
 *          createFinishRequest 发起完成申请、getPendingFinishRequest 查询当前待处理的完成申请、
 *          reviewFinishRequest 处理（同意/拒绝）申请、withdrawFinishRequest 撤回自己发起的完成申请。
 * 主要交互：进入即拉取会话详情、消息列表与待处理完成申请；填写消息并提交；
 *          再按「有无待办申请 + 是谁发起的」渲染状态条，提供发起/同意/拒绝/撤回。
 * 注意：后端在完成申请被发起/同意/拒绝/撤回时会往会话里写一条 senderId 为 null 的「系统消息」，
 *      本页把它们渲染成居中的灰色提示条，而不是某一侧的正常聊天气泡。
 */
<script setup lang="ts">
// ref 创建响应式状态；onMounted 注册“组件挂载后”的回调（这里用来加载会话详情与消息）。
import { onMounted, ref } from 'vue'
// 只用到 useRoute 读取路由参数 :id，本页没有编程式跳转需求。
import { useRoute } from 'vue-router'
// 会话接口；Message 是 type-only 导入，编译后会被擦除。
import { createFinishRequest, getConversationDetail, getMessages, getPendingFinishRequest, reviewFinishRequest, sendMessage, withdrawFinishRequest, type Message } from '@/api/conversations'
// Conversation 类型定义在全局 @/types 中（与后端会话结构一一对应）。
import type { Conversation, FinishRequest } from '@/types'
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
// 当前待处理的「完成寻找」申请，null 表示没有待办。后端的申请编号不会出现在界面上，
// 所以「同意/拒绝/撤回」必须先用它查出来、再带着里面的 id 调接口，不能靠用户手输编号。
// 同一会话同一时刻后端最多只允许一条 pending 申请，故用单个 ref 而不是数组。
const pendingRequest = ref<FinishRequest | null>(null)
// 路由参数 :id 是字符串，转成数字再用于接口；非法值（NaN）会在 loadConversation 里被拦截。
const conversationId = Number(route.params.id)

/**
 * 拉取本会话详情、历史消息与当前待处理的完成申请。
 * 触发方式：组件挂载时（onMounted(loadConversation)）。
 * 若 :id 解析不出有效数字，直接报错并结束加载，避免发出 /conversations/NaN/messages 这种请求。
 * 三个请求互不依赖，用 Promise.all 并发拉取，比串行 await 更快。
 * 成功后分别写入 conversation / messages / pendingRequest；失败写入 errorMessage；
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
    // 会话详情里带有帖子标题与完成状态快照，聊天页据此展示标题、跳转原帖并决定是否隐藏「申请完成」入口；
    // 待办申请一并查出来，页面一进来就能显示「等待对方处理」或「对方申请完成，是否同意」。
    const [detail, messageList, pending] = await Promise.all([
      getConversationDetail(conversationId),
      getMessages(conversationId),
      getPendingFinishRequest(conversationId),
    ])
    conversation.value = detail
    messages.value = messageList
    pendingRequest.value = pending
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '会话加载失败'
  } finally {
    loading.value = false
  }
}

/**
 * 判断一条消息是不是后端写入的「系统消息」（完成申请的发起/处理/撤回留痕）。
 * 依据：这类消息没有真实发送者，sender_id 在数据库里是 NULL，经 mapMessage 后为 null。
 */
function isSystem(message: Message): boolean {
  return message.senderId === null
}

/**
 * 完成申请状态发生变化后，把消息列表与会话详情重新拉一遍。
 *
 * 单独抽出来的原因：这两次请求只是「让界面跟上后端」，属于收尾动作。
 * 它们失败时不能覆盖上面那个接口操作给出的成功提示，所以这里主动吞掉异常
 * （最坏情况是界面略旧，用户刷新页面即可）。
 */
async function refreshConversation() {
  try {
    const [detail, messageList] = await Promise.all([getConversationDetail(conversationId), getMessages(conversationId)])
    conversation.value = detail
    messages.value = messageList
  } catch {
    // 故意静默：刷新失败不影响已经成功的申请操作。
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
 * 成功后把后端返回的申请写进 pendingRequest，界面立刻变成「等待对方处理」；
 * 失败（如后端判定无权发起、已有待处理申请）写入 finishMessage。
 */
async function requestFinish() {
  if (finishLoading.value) return
  finishLoading.value = true
  finishMessage.value = ''
  try {
    // 直接用返回值更新待办状态，省掉一次「再查一遍待办」的请求。
    pendingRequest.value = await createFinishRequest(conversationId)
    finishMessage.value = '已发起完成寻找申请，等待对方确认。'
    // 后端会同时写一条系统消息留痕，所以要把消息列表拉一遍才能看到。
    await refreshConversation()
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '无法发起完成申请'
  } finally {
    finishLoading.value = false
  }
}

/**
 * 处理（同意 / 拒绝）当前待办的完成申请。
 * 触发方式：点击“同意”或“拒绝”按钮，status 分别为 'agreed' / 'rejected'。
 *
 * 申请编号取自 pendingRequest（进页面时查出来的），不再让用户手输——
 * 编号在界面上根本没有展示的地方，手输等于这个操作不可用。
 * 成功后清空 pendingRequest 让状态条消失；同意时帖子会被标记完成，
 * 因此额外刷新会话详情，让「已完成」标签与「申请完成寻找」入口同步变化。
 * 说明：谁能发起、谁能审批由后端按会话双方与申请状态判定，前端只负责提交与展示结果。
 */
async function reviewFinish(status: 'agreed' | 'rejected') {
  // 没有待办申请就无从处理（正常渲染下按钮此时也不会出现，这里再兜一层防误触）。
  if (!pendingRequest.value || finishLoading.value) return
  finishLoading.value = true
  finishMessage.value = ''
  try {
    await reviewFinishRequest(conversationId, pendingRequest.value.id, status)
    finishMessage.value = status === 'agreed' ? '已同意，帖子已标记为完成。' : '已拒绝完成申请。'
    // 这条申请已被处理，不再是「待处理」，清空本地状态让状态条消失。
    pendingRequest.value = null
    await refreshConversation()
  } catch (error) {
    finishMessage.value = error instanceof Error ? error.message : '处理完成申请失败'
  } finally {
    finishLoading.value = false
  }
}

/**
 * 撤回自己发起的“完成寻找申请”。
 * 触发方式：状态条上的“撤回申请”按钮（只在待办申请由本人发起时才渲染）。
 * 语义：只有发起方本人、且申请仍是待处理状态才能撤回；撤回后帖子不受影响。
 * 成功后清空待办状态；失败（非发起方 / 申请已被处理）写入 finishMessage。
 */
async function withdrawFinish() {
  if (!pendingRequest.value || finishLoading.value) return
  finishLoading.value = true
  finishMessage.value = ''
  try {
    await withdrawFinishRequest(conversationId, pendingRequest.value.id)
    finishMessage.value = '已撤回该完成寻找申请。'
    pendingRequest.value = null
    await refreshConversation()
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
      <!-- 完成寻找状态条（进页面就查了一次待办申请，所以三种状态无需用户手动触发即能正确显示）：
           1) 有待办且是我发起的 → 只能等对方处理，可撤回；
           2) 有待办且是对方发起的 → 我来同意或拒绝；
           3) 无待办且帖子已完成 → 仅展示完成提示。 -->
      <div v-if="pendingRequest" class="finish-banner">
        <template v-if="pendingRequest.requesterId === user?.id">
          <span>你已发起完成寻找申请，等待对方处理…</span>
          <button class="text-button" :disabled="finishLoading" @click="withdrawFinish">撤回申请</button>
        </template>
        <template v-else>
          <span>对方申请完成寻找，是否同意？同意后该帖子将被标记为已完成。</span>
          <span class="finish-banner-actions">
            <button class="primary-button" :disabled="finishLoading" @click="reviewFinish('agreed')">同意</button>
            <button class="secondary-button" :disabled="finishLoading" @click="reviewFinish('rejected')">拒绝</button>
          </span>
        </template>
      </div>
      <p v-else-if="conversation?.postIsFinished" class="finish-done">该帖子已完成寻找</p>
      <!-- 三态渲染：加载中 → 无消息空态 → 消息列表（v-else 里用 v-for 遍历，:key=message.id） -->
      <div v-if="loading" class="empty-state">正在加载消息...</div>
      <div v-else-if="!messages.length" class="empty-state">还没有消息，先介绍一下物品特征吧。</div>
      <div v-else class="message-list">
        <!-- 三种行样式：mine（我发的，靠右高亮）/ system（后端系统消息，居中灰条）/ 其余为对方。 -->
        <div v-for="message in messages" :key="message.id" class="message-row" :class="{ mine: message.senderId === user?.id, system: isSystem(message) }">
          <!-- 系统消息没有发送者（senderId 为 null），不套聊天气泡、也不显示时间，用居中灰条表达「这是流程留痕」 -->
          <p v-if="isSystem(message)" class="message-system">{{ message.content }}</p>
          <div v-else class="message-bubble"><p>{{ message.content }}</p><time>{{ new Date(message.createdAt).toLocaleString() }}</time></div>
        </div>
      </div>
      <!-- errorMessage / finishMessage 分别提示错误与结果 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="finishMessage" class="success-message">{{ finishMessage }}</p>
      <!-- 发起入口：已有待办申请或帖子已完成时都不再显示，避免发出必然被后端拒绝的重复申请。
           同意/拒绝/撤回按钮已经移到上面的状态条里，只在真正有待办时出现。 -->
      <div v-if="!pendingRequest && !conversation?.postIsFinished" class="conversation-actions">
        <button class="secondary-button" :disabled="finishLoading" @click="requestFinish">申请完成寻找</button>
      </div>
      <!-- 发送消息表单：@submit.prevent 阻止浏览器默认刷新并调用 submit；textarea 用 v-model 双向绑定 content -->
      <form class="message-form" @submit.prevent="submit">
        <textarea v-model="content" maxlength="1000" required placeholder="输入消息"></textarea>
        <button class="primary-button" :disabled="sending">{{ sending ? '发送中...' : '发送消息' }}</button>
      </form>
    </div>
  </section>
</template>
