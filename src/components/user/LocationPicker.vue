<!--
  校园地点选择器（发布页复用组件）。

  背景：参考实现（后端仓库 frontend-demo 的 components/LocationPicker.vue）把「选地点」抽成了独立组件，
        本组件用 vue-win 的技术栈（<script setup> + TypeScript）复刻它的交互与提示文案。

  能力：
    1) 一键自动定位：浏览器 Geolocation 取经纬度 → 后端 POST /geo/locate 匹配最近的校园预设地点；
    2) 手动兜底：从后端返回的「校区 → 地点」分组下拉里选，选项带地点分类（同名地点靠分类区分）；
    3) 地点补充：一句话补充说明（≤200 字），与地点一起作为帖子字段提交；
    4) 定位失败分诊：把 Geolocation 的错误码翻成「用户照着做就能解决」的提示。

  对外协议：v-model 绑定选中的地点 id；v-model:supplement 绑定补充说明。
  这两个字段正好对应父组件表单里的 form.locationId / form.supplement，
  提交时由 createItem() 拼成后端的 location_id / supplement（见 @/api/posts 的 createItem）。

  依赖：@/api/geo 的 getLocations() 与 locateNearest()——两个接口都是公开的，无需登录。
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getLocations, locateNearest } from '@/api/geo'
import type { LocateResult } from '@/api/geo'
import type { LocationGroup } from '@/types'

// 组件对外契约：父组件只关心「最终要提交的两个字段」，中间的定位/匹配过程全部封装在组件内部。
const props = defineProps<{
  // 选中的地点 id；空串表示尚未选择（下拉框会停在「请选择校园地点」）
  modelValue: string
  // 地点补充说明
  supplement: string
  // 禁用整个选择器（父组件提交中时可传入，避免用户改到一半）
  disabled?: boolean
}>()

const emit = defineEmits<{
  // v-model 的标准更新事件
  'update:modelValue': [value: string]
  // v-model:supplement 的更新事件
  'update:supplement': [value: string]
}>()

// 用 computed 的 get/set 把 props 包装成可 v-model 绑定的双向代理：
// 读时直接返回父组件的值（单一数据源，组件内不另存一份，避免父子数据不同步），
// 写时通过 emit 把新值交回父组件。
const selectedId = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
const supplementText = computed({
  get: () => props.supplement,
  set: (value: string) => emit('update:supplement', value),
})

// 后端返回的「校区 → 地点」分组，用于下拉框的 optgroup 渲染。
const groups = ref<LocationGroup[]>([])
// 最近一次自动定位的完整结果（地点 + 距离 + 匹配方式），仅用于展示提示。
const matched = ref<LocateResult | null>(null)
// 定位请求进行中：禁用按钮，避免连点产生重复请求。
const locating = ref(false)
// 成败两类提示分开存放，避免互相覆盖。
const infoMessage = ref('')
const errorMessage = ref('')

/**
 * 挂载时拉取校园预设地点。
 * 触发时机：组件挂载（进入发布页时执行一次）。
 * 失败处理：只提示、不阻塞页面——用户仍可看到表单其余部分，而不是整页白屏。
 */
onMounted(async () => {
  try {
    groups.value = await getLocations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '地点列表加载失败，请稍后重试'
  }
})

/**
 * 把浏览器 Geolocation 的错误码翻译成可操作的提示。
 *
 * 为什么不统一提示「定位失败」：三种失败的解决办法完全不同，
 * 一律提示「失败」会让用户以为是自己操作错了或网站坏了。
 *
 * 用数字字面量而不是 GeolocationPositionError.PERMISSION_DENIED 等常量：
 * 这些常量在 TS 的 DOM 类型定义里挂在构造函数上，实例对象上取不到，写数字加注释更稳。
 *
 * @param code GeolocationPositionError.code：1=权限被拒，2=位置不可用，3=超时
 * @returns 对应的中文提示
 */
function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return '定位权限被拒绝：请点浏览器地址栏左侧的权限图标，把「位置」改为「允许」，并确认系统定位服务已开启'
    case 2:
      return '无法获取位置：请确认系统定位服务已开启，或当前网络环境不支持定位（可改用手动选择地点）'
    case 3:
      return '定位超时：请重试，或改用手动选择地点'
    default:
      return '定位失败，请手动选择地点'
  }
}

/**
 * 一键自动定位：取浏览器经纬度交给后端匹配最近的校园预设地点，成功后自动选中该地点。
 *
 * 触发时机：点击「一键定位最近地点」按钮（button 必须是 type="button"，
 *          否则在 form 内会被当成提交按钮，点一下就把表单提交了）。
 *
 * 关键限制：浏览器只在「安全上下文」（HTTPS 或 localhost）才允许定位。
 * 生产上若用 http://<公网IP> 访问（本项目的 120.26.56.74 就是这种），
 * getCurrentPosition 必然失败。因此这里先判 window.isSecureContext 提前拦下，
 * 直接说明真实原因，而不是让用户看到一条看不出所以然的失败提示。
 */
async function handleLocate() {
  if (locating.value || props.disabled) return
  infoMessage.value = ''
  errorMessage.value = ''
  if (!('geolocation' in navigator)) {
    errorMessage.value = '当前浏览器不支持定位，请手动选择地点'
    return
  }
  // 非安全上下文直接短路：这是 http://IP 部署下最常见、也最容易被误判成「代码有 bug」的原因。
  if (!window.isSecureContext) {
    errorMessage.value = '当前页面不是安全上下文：浏览器仅在 HTTPS 或 localhost 下允许定位。请手动选择地点，升级到 HTTPS 后此按钮才可用。'
    return
  }

  locating.value = true
  try {
    // getCurrentPosition 是回调式 API，用 Promise 包一层才能配合 async/await。
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        // 【必须开启高精度】参考实现 0c4f1d0 专门修过这里：
        // 关掉高精度时，室内会退化成基站/Wi-Fi 粗定位（误差可达数百米），
        // 后端匹配出的楼栋会跨片区选错。
        enableHighAccuracy: true,
        // 10 秒：高精度模式本身更慢，给太短会在弱网下误报超时，给太长又让用户干等。
        timeout: 10000,
        // 置 0：不复用缓存坐标，避免拿用户「走位之前」的位置去匹配地点。
        maximumAge: 0,
      })
    })
    // 把坐标和已填的补充说明一起提交，后端会返回匹配到的地点（match_type='auto'）与直线距离。
    const result = await locateNearest(position.coords.latitude, position.coords.longitude, props.supplement)
    matched.value = result
    // 写入地点 id：父组件的 v-model 同步更新，下方下拉框会自动选中它（无需再查一次地点列表）。
    selectedId.value = result.location.id
    // 距离是浮点数（米），取整后展示更自然。
    infoMessage.value = `已定位到最近地点：${result.location.name}（${result.location.campus} · ${result.location.address}），约 ${Math.round(result.distanceMeters)} 米`
  } catch (error) {
    // 两类错误要分开识别：
    // - 接口失败抛的是 Error（后端 msg），直接展示它的 message；
    // - 浏览器定位失败抛的是 GeolocationPositionError（没有 message，只有 code），走分诊表。
    errorMessage.value = error instanceof Error
      ? error.message
      : geolocationErrorMessage((error as GeolocationPositionError).code)
  } finally {
    locating.value = false
  }
}

/**
 * 手动选择地点后的清理。
 * 触发时机：下拉框 @change（仅用户手动操作时触发，程序化赋值不会触发）。
 * 目的：清掉上一次的自动定位结果与提示，避免出现「下拉选了 A、提示还写着 B」的自相矛盾。
 */
function handleManualSelect() {
  matched.value = null
  infoMessage.value = ''
  errorMessage.value = ''
}

/**
 * 清除当前选择：地点、补充说明、全部提示一并复位。
 * 用途：用户改主意或定位到错误地点后想重选，不必逐个字段手动删。
 */
function handleClear() {
  matched.value = null
  infoMessage.value = ''
  errorMessage.value = ''
  selectedId.value = ''
  supplementText.value = ''
}
</script>

<template>
  <div>
    <label>发生地点
      <!-- required 让浏览器在未选地点时拦截表单提交（与提交前的 JS 校验形成双保险）。
           手动选择与自动定位共用这一个下拉框：自动定位只是把匹配到的 id 写进 v-model，
           选项本身始终来自 getLocations()，因此选中值一定是合法选项。 -->
      <select v-model="selectedId" :disabled="disabled" required @change="handleManualSelect">
        <option value="" disabled>请选择校园地点</option>
        <!-- optgroup 按校区分组；选项名后带地点分类，便于区分不同校区的同名地点 -->
        <optgroup v-for="group in groups" :key="group.campus" :label="group.campus">
          <option v-for="location in group.locations" :key="location.id" :value="location.id">
            {{ location.name }}（{{ location.category }}）
          </option>
        </optgroup>
      </select>
    </label>

    <!-- 一键定位行：按钮必须是 type="button"，清除按钮只在已有选择时出现 -->
    <div class="locate-row">
      <button class="secondary-button" type="button" :disabled="locating || disabled" @click="handleLocate">{{ locating ? '定位中...' : '一键定位最近地点' }}</button>
      <button v-if="selectedId" class="secondary-button" type="button" :disabled="disabled" @click="handleClear">清除</button>
      <span v-if="infoMessage" class="muted">{{ infoMessage }}</span>
    </div>

    <label>地点补充
      <input v-model="supplementText" maxlength="200" :disabled="disabled" placeholder="例如：东门台阶旁、3 号楼门口快递柜" />
    </label>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </div>
</template>