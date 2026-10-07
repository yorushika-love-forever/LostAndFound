/**
 * 账号申诉页 —— 对应路由 /appeal，是公开页面（账号被限制登录的人也要能用，因此不要求登录）。
 * 表单收集学号、申诉原因、情况说明，提交后调用 api/appeals 的 createAppeal()，
 * 即请求后端 POST /api/v1/appeals，把申诉交给管理员人工审核。
 * 提交成功后本页不做路由跳转，而是用 submitted 切换成一个“已提交”的提示面板。
 */
<script setup lang="ts">
// reactive 存整个表单对象；ref 存 loading / submitted / errorMessage 这些单值状态。
import { reactive, ref } from 'vue'
// createAppeal 是提交申诉接口的封装；AppealReason 是申诉原因的联合类型，
// 用 type 导入是因为它只存在于类型层面，编译后会被擦除。
import { createAppeal, type AppealReason } from '@/api/appeals'

// 表单数据：显式标注类型，reason 只能是 AppealReason 允许的几个值。
// 默认选中 'wrongful_ban'（被误封禁），与模板里 select 的第一个选项对应。
const form = reactive<{ username: string; reason: AppealReason; content: string }>({ username: '', reason: 'wrongful_ban', content: '' })
// 请求进行中的标志，用于禁用提交按钮、防止重复提交。
const loading = ref(false)
// 是否已提交成功；为 true 时模板用 v-else 隐藏表单、显示成功面板。
const submitted = ref(false)
// 错误提示文案。
const errorMessage = ref('')

/**
 * 提交申诉表单的处理函数。
 * 触发时机：点击“提交申诉”按钮，或在表单内回车触发 @submit。
 * 流程：清空错误 → 仅当原因为“其他”时才要求填写情况说明 →
 *      调 createAppeal(form) 请求 POST /api/v1/appeals →
 *      成功把 submitted 置为 true 切换到成功面板；失败则展示后端返回的错误。
 */
async function submit() {
  // 先清空上一次的错误提示。
  errorMessage.value = ''
  // 业务校验：只有选择“其他原因”时才强制要求填写说明，其它原因可以不写。
  // 模板的 :required 也同步了这条规则，这里再兜底一次，防止有人绕过浏览器校验直接提交。
  if (form.reason === 'other' && !form.content.trim()) { errorMessage.value = '选择其他原因时必须填写说明'; return }
  // 校验通过，开始请求，置 loading 禁用按钮防止重复提交。
  loading.value = true
  // 用 try/catch/finally 保证请求异常也能正确收尾（压成一行是原作者的写法，逻辑与多行等价）。
  try { await createAppeal(form); submitted.value = true }
  // 失败时 request() 会抛出 Error(msg)，优先取 error.message 作为提示文案。
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '申诉提交失败' }
  // 无论成功失败都复位 loading。
  finally { loading.value = false }
}
</script>

<template>
  <!-- 与登录/注册页一致的 auth-layout 布局。 -->
  <section class="auth-layout">
    <!-- 左侧纯展示宣传区。 -->
    <div class="auth-intro"><p class="eyebrow">ACCOUNT APPEAL</p><h1>账号遇到问题？<br /><em>提交申诉。</em></h1><p>账号注销或被限制登录后，可以在这里向系统管理员说明情况。</p></div>
    <!-- 表单区：v-if="!submitted" 表示“未提交成功时才显示”；提交成功后这一整块会被下面的成功面板替换。 -->
    <form v-if="!submitted" class="panel auth-form" @submit.prevent="submit">
      <!-- 表单标题区。 -->
      <p class="eyebrow">PUBLIC FORM</p><h2>账号申诉</h2>
      <!-- 学号：填写被限制或被注销的那个账号。 -->
      <label>学号<input v-model="form.username" required inputmode="numeric" placeholder="请输入被限制的学号" /></label>
      <!-- 申诉原因：select 用 v-model 绑定 form.reason，选中项写回数据（选项值用英文枚举，展示给用户的是中文）。 -->
      <label>申诉原因<select v-model="form.reason"><option value="wrongful_ban">被误封禁</option><option value="self_regret">注销后希望恢复</option><option value="other">其他原因</option></select></label>
      <!-- 情况说明：:required="form.reason === 'other'" 是动态绑定——只有选了“其他原因”时才变成必填。 -->
      <label>情况说明<textarea v-model="form.content" maxlength="1000" :required="form.reason === 'other'" placeholder="请提供便于管理员核实的信息"></textarea></label>
      <!-- 错误提示 + 提交按钮：v-if 控制错误是否显示，:disabled 在请求期间禁用按钮防止重复提交。 -->
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p><button class="primary-button" :disabled="loading">{{ loading ? '提交中...' : '提交申诉' }}</button>
      <!-- 底部返回登录链接。 -->
      <p class="form-tip"><RouterLink to="/login" class="detail-link">返回登录</RouterLink></p>
    </form>
    <!-- 提交成功后的替代面板：v-else 与上面的 v-if="!submitted" 配对，两者同一时刻只会显示其一。 -->
    <div v-else class="panel auth-form"><p class="eyebrow">SUBMITTED</p><h2>申诉已提交</h2><p class="page-lead">管理员审核后会处理你的账号状态。你可以稍后返回登录页重试。</p><RouterLink to="/login" class="primary-button">返回登录</RouterLink></div>
  </section>
</template>
