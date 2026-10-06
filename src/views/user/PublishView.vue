<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '@/api/posts'
import { getLocations } from '@/api/geo'
import type { ItemForm, LocationGroup } from '@/types'

const router = useRouter()
const submitted = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const locations = ref<LocationGroup[]>([])
const imagePreview = ref('')
const form = reactive<ItemForm>({ title: '', type: 'lost', description: '', locationId: '', supplement: '', image: null })

onMounted(async () => {
  try {
    locations.value = await getLocations()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '地点加载失败'
  }
})

function chooseImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null
  if (file && !file.type.startsWith('image/')) {
    errorMessage.value = '请选择图片文件'
    form.image = null
    imagePreview.value = ''
    return
  }
  if (file && file.size > 5 * 1024 * 1024) {
    errorMessage.value = '图片大小不能超过 5MB'
    form.image = null
    imagePreview.value = ''
    return
  }
  form.image = file
  imagePreview.value = file ? URL.createObjectURL(file) : ''
}

async function submit() {
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
    <form class="panel item-form" @submit.prevent="submit">
      <div class="segmented"><label><input v-model="form.type" type="radio" value="lost" />我丢失了物品</label><label><input v-model="form.type" type="radio" value="found" />我捡到了物品</label></div>
      <label>物品名称<input v-model="form.title" required maxlength="2000" placeholder="例如：黑色双肩包" /></label>
      <label>发生地点
        <select v-model="form.locationId" required>
          <option value="" disabled>请选择校园地点</option>
          <optgroup v-for="group in locations" :key="group.campus" :label="group.campus">
            <option v-for="location in group.locations" :key="location.id" :value="location.id">{{ location.name }}</option>
          </optgroup>
        </select>
      </label>
      <label>地点补充<textarea v-model="form.supplement" maxlength="200" placeholder="例如：东门台阶旁"></textarea></label>
      <label>详细描述<textarea v-model="form.description" required maxlength="2000" placeholder="描述颜色、品牌、特殊标记等关键信息"></textarea></label>
      <label>物品图片<input type="file" accept="image/*" @change="chooseImage" /></label>
      <div v-if="imagePreview" class="image-preview"><img :src="imagePreview" alt="待上传的物品图片" /><span>{{ form.image?.name }}</span></div>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <div class="form-actions"><RouterLink to="/home" class="secondary-button">取消</RouterLink><button class="primary-button" :disabled="submitted || loading">{{ submitted ? '提交成功' : loading ? '提交中...' : '提交审核' }}</button></div>
    </form>
  </section>
</template>
