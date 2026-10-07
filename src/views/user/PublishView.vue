<!--
  发布信息页（路由：`/publish`，需要登录，见 router/index.ts）。
  作用：填写物品类型 / 名称 / 地点 / 描述并上传图片，提交后交由管理员审核。
  地点部分交给复用组件 LocationPicker（内部读 GET /geo/locations、写 POST /geo/locate）。
  提交接口：createItem(form)（`POST /posts`，以 multipart/form-data 上传图片）。
  主要交互：选择图片时本地校验并预览、提交前表单校验、成功后延时跳转到「我的记录」。
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '@/api/posts'
import LocationPicker from '@/components/user/LocationPicker.vue'
import type { ItemForm } from '@/types'

const router = useRouter()
// submitted 标记「已提交成功」：把按钮置为不可点并显示成功文案，防止重复提交。
const submitted = ref(false)
// loading 表示请求进行中，同样用于禁用按钮。
const loading = ref(false)
const errorMessage = ref('')
// imagePreview 存本地预览用的 blob URL（并非后端地址），仅在提交前展示。
const imagePreview = ref('')
// reactive 收集整张表单；字段名与 ItemForm 对齐，type 默认 'lost'（我丢失了物品）。
// locationId 与 supplement 由 LocationPicker 通过 v-model / v-model:supplement 写入。
const form = reactive<ItemForm>({ title: '', type: 'lost', description: '', locationId: '', supplement: '', image: null })

/**
 * 处理图片选择（input type=file 的 @change）。
 * 触发时机：用户在文件框选中图片时。
 * 逻辑：先做类型、大小校验，不通过则清空并提示；通过则存入 form.image 并生成本地预览。
 * 说明：这里只做前端初步校验，真正存储由后端完成；URL.createObjectURL 生成的是本地临时地址。
 */
function chooseImage(event: Event) {
  // event.target 在 TS 里是宽泛的 EventTarget，断言成 input 才能读取 files。
  const file = (event.target as HTMLInputElement).files?.[0] || null
  // 只接受 image/* 类型，非图片直接拒绝。
  if (file && !file.type.startsWith('image/')) {
    errorMessage.value = '请选择图片文件'
    form.image = null
    imagePreview.value = ''
    return
  }
  // 限制 5MB，避免上传过大文件。
  if (file && file.size > 5 * 1024 * 1024) {
    errorMessage.value = '图片大小不能超过 5MB'
    form.image = null
    imagePreview.value = ''
    return
  }
  form.image = file
  // 有文件才生成预览地址，未选文件时清空预览。
  imagePreview.value = file ? URL.createObjectURL(file) : ''
}

/**
 * 提交表单。
 * 触发时机：表单 @submit.prevent（点「提交审核」按钮）。
 * 校验：标题、描述、地点都非空才允许提交，否则提示并中断。
 * 调用接口：createItem(form) —— 内部用 FormData 以 multipart/form-data 上传，字段名与后端约定一致。
 * 成功：置 submitted 为 true，700ms 后跳转「我的记录」/mine（留时间展示成功文案）。
 * 失败：写入 errorMessage；finally 关闭 loading。
 */
async function submit() {
  // 前端先做必填校验，避免无意义的网络请求。
  if (!form.title.trim() || !form.description.trim() || !form.locationId) {
    errorMessage.value = '请填写标题、描述并选择发生地点'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await createItem(form)
    submitted.value = true
    window.setTimeout(() => router.push('/mine'), 700)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="form-page">
    <div class="section-heading"><div><p class="eyebrow">SHARE A CLUE</p><h1>发布一条信息</h1></div></div>
    <p class="page-lead">请尽可能完整地描述物品，让信息更容易被找到。</p>
    <!-- @submit.prevent 阻止浏览器默认的整页提交，改由 submit() 通过接口提交 -->
    <form class="panel item-form" @submit.prevent="submit">
      <!-- 单选组绑定 form.type：value 即提交给后端的 'lost' / 'found' -->
      <div class="segmented"><label><input v-model="form.type" type="radio" value="lost" />我丢失了物品</label><label><input v-model="form.type" type="radio" value="found" />我捡到了物品</label></div>
      <label>物品名称<input v-model="form.title" required maxlength="2000" placeholder="例如：黑色双肩包" /></label>
      <!-- 地点选择器：v-model 双向绑定地点 id，v-model:supplement 双向绑定补充说明。
           两个值最终由 createItem 拼成后端的 location_id / supplement。
           提交中（loading）时禁用，避免用户改到一半。 -->
      <LocationPicker v-model="form.locationId" v-model:supplement="form.supplement" :disabled="loading || submitted" />
      <label>详细描述<textarea v-model="form.description" required maxlength="2000" placeholder="描述颜色、品牌、特殊标记等关键信息"></textarea></label>
      <!-- accept="image/*" 只用于过滤文件选择器；真正的类型/大小校验在 chooseImage 里 -->
      <label>物品图片<input type="file" accept="image/*" @change="chooseImage" /></label>
      <!-- 选了图片才显示预览；预览用本地 blob URL，文件名取自 form.image -->
      <div v-if="imagePreview" class="image-preview"><img :src="imagePreview" alt="待上传的物品图片" /><span>{{ form.image?.name }}</span></div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <!-- 取消用 RouterLink 走前端路由；提交按钮在成功/提交中时 disabled，杜绝重复提交 -->
      <div class="form-actions"><RouterLink to="/home" class="secondary-button">取消</RouterLink><button class="primary-button" :disabled="submitted || loading">{{ submitted ? '提交成功' : loading ? '提交中...' : '提交审核' }}</button></div>
    </form>
  </section>
</template>