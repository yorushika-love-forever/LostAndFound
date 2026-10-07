<!--
  发布信息页（路由：`/publish`，需要登录，见 router/index.ts）。
  作用：填写物品类型 / 名称 / 地点 / 描述并上传图片，提交后交由管理员审核。
  读取接口：getLocations()（`GET /geo/locations`，用于地点分组下拉）、
           locateNearest()（`POST /geo/locate`，把浏览器定位坐标交给后端匹配最近地点）。
  提交接口：createItem(form)（`POST /posts`，以 multipart/form-data 上传图片）。
  主要交互：一键定位最近地点、选择图片时本地校验并预览、提交前表单校验、成功后延时跳转到「我的记录」。
-->
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '@/api/posts'
import { getLocations, locateNearest } from '@/api/geo'
import type { ItemForm, LocationGroup } from '@/types'

const router = useRouter()
// submitted 标记「已提交成功」：把按钮置为不可点并显示成功文案，防止重复提交。
const submitted = ref(false)
// loading 表示请求进行中，同样用于禁用按钮。
const loading = ref(false)
const errorMessage = ref('')
// locations 保存后端返回的「园区 → 地点」分组，供 optgroup 渲染。
const locations = ref<LocationGroup[]>([])
// imagePreview 存本地预览用的 blob URL（并非后端地址），仅在提交前展示。
const imagePreview = ref('')
// 定位请求进行中标记：用于禁用「一键定位」按钮，避免连点重复请求。
const locating = ref(false)
// 定位成功后的提示（如「已定位到最近地点：图书馆（约 120 米）」）。
const locateMessage = ref('')
// reactive 收集整张表单；字段名与 ItemForm 对齐，type 默认 'lost'（我丢失了物品）。
const form = reactive<ItemForm>({ title: '', type: 'lost', description: '', locationId: '', supplement: '', image: null })

/**
 * 页面挂载时加载校园地点列表。
 * 触发时机：onMounted（进入发布页时执行一次）。
 * 调用接口：getLocations() → `GET /geo/locations`。
 * 成功：写入 locations 供下拉框渲染；失败：写入 errorMessage。
 */
onMounted(async () => {
  try {
    locations.value = await getLocations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '地点加载失败'
  }
})

/**
 * 一键定位最近地点：浏览器取 GPS 坐标 → 后端匹配最近的校园预设地点 → 自动填入下拉框。
 * 触发时机：点击地点下拉框下方的「一键定位最近地点」按钮（type="button"，不会触发表单提交）。
 * 调用接口：locateNearest(lat, lng)（`POST /geo/locate`）。
 * 成功：把返回的地点 id 写进 form.locationId（下拉框会自动选中它），并显示「地点 + 距离」提示。
 * 失败：写入 errorMessage。
 *
 * 注意：出于安全考虑，浏览器只在「安全上下文」（HTTPS 或 localhost）才允许定位。
 * 用 http://IP 访问时 getCurrentPosition 会直接失败，此时提示用户改用手动选择。
 */
async function locateNearestLocation() {
  if (locating.value) return
  locateMessage.value = ''
  errorMessage.value = ''
  // 先判断浏览器是否具备定位能力，避免在不支持的浏览器上抛异常。
  if (!navigator.geolocation) {
    errorMessage.value = '当前浏览器不支持定位，请手动选择地点'
    return
  }
  locating.value = true
  try {
    // getCurrentPosition 是回调式 API，用 Promise 包一层才能配合 async/await 使用。
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
    })
    const result = await locateNearest(position.coords.latitude, position.coords.longitude)
    // 只写 locationId：下拉框的选项由 getLocations 渲染，匹配到的 id 一定在其中，选中即可。
    form.locationId = result.location.id
    // 距离是浮点数（米），取整后展示更自然。
    locateMessage.value = `已定位到最近地点：${result.location.name}（约 ${Math.round(result.distanceMeters)} 米）`
  } catch (error) {
    // 定位失败时浏览器抛的是 GeolocationPositionError（不是 Error 实例），
    // 因此这里给一句兼顾「未授权 / 非 HTTPS / 超时」的通用提示。
    errorMessage.value = error instanceof Error ? error.message : '定位失败（需在 HTTPS 或 localhost 下且授权定位），请手动选择地点'
  } finally {
    locating.value = false
  }
}

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
      <label>发生地点
        <!-- locationId 存的是地点 id（字符串），提交时对应后端的 location_id 字段 -->
        <select v-model="form.locationId" required>
          <option value="" disabled>请选择校园地点</option>
          <!-- optgroup 按园区分组展示地点；:key 用 campus 与 location.id，保证值唯一稳定 -->
          <optgroup v-for="group in locations" :key="group.campus" :label="group.campus">
            <option v-for="location in group.locations" :key="location.id" :value="location.id">{{ location.name }}</option>
          </optgroup>
        </select>
      </label>
      <!-- 一键定位：用浏览器定位坐标请后端匹配最近的预设地点，省去手动翻找下拉框。
           必须是 type="button"，否则在 form 内会被当成提交按钮触发表单提交。 -->
      <div class="locate-row">
        <button class="secondary-button" type="button" :disabled="locating" @click="locateNearestLocation">{{ locating ? '定位中...' : '一键定位最近地点' }}</button>
        <span v-if="locateMessage" class="muted">{{ locateMessage }}</span>
      </div>
      <label>地点补充<textarea v-model="form.supplement" maxlength="200" placeholder="例如：东门台阶旁"></textarea></label>
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
