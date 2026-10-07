<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createAnnouncementApi,
  deleteAnnouncementApi,
  getAnnouncementsApi,
  updateAnnouncementApi,
  updateAnnouncementStatusApi,
} from '@/api/admin'
import { backendSupport } from '@/admin/config'
import {
  announcementStatusText,
  formatDate,
} from '@/admin/format'
import type { AdminAnnouncement } from '@/admin/types'

const announcements = ref<AdminAnnouncement[]>([])
const loading = ref(false)
const errorMessage = ref('')
const form = reactive({
  title: '',
  content: '',
  status: 'published' as 'draft' | 'published',
})

async function loadAnnouncements() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getAnnouncementsApi({
      page: 1,
      page_size: 100,
    })
    announcements.value = result.list
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '查询失败'
  } finally {
    loading.value = false
  }
}

async function createAnnouncement() {
  if (!form.title.trim() || !form.content.trim()) {
    errorMessage.value = '请填写标题和内容'
    return
  }

  try {
    await createAnnouncementApi({
      title: form.title,
      content: form.content,
      status: form.status,
    })

    form.title = ''
    form.content = ''
    await loadAnnouncements()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '创建失败')
  }
}

async function changeStatus(
  announcement: AdminAnnouncement,
  status: 'draft' | 'published',
) {
  try {
    await updateAnnouncementStatusApi(announcement.id, status)
    await loadAnnouncements()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '操作失败')
  }
}

async function edit(announcement: AdminAnnouncement) {
  const title = window.prompt('请输入新的公告标题', announcement.title)
  if (title === null || !title.trim()) return

  const content = window.prompt('请输入新的公告内容', announcement.content)
  if (content === null || !content.trim()) return

  try {
    await updateAnnouncementApi(announcement.id, {
      title: title.trim(),
      content: content.trim(),
    })
    await loadAnnouncements()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '编辑失败')
  }
}

async function remove(announcement: AdminAnnouncement) {
  if (!window.confirm(`确定删除“${announcement.title}”吗？`)) return

  try {
    await deleteAnnouncementApi(announcement.id)
    await loadAnnouncements()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(() => {
  if (backendSupport.adminAnnouncements) {
    void loadAnnouncements()
  }
})
</script>

<template>
  <div>
    <h2 class="page-title">公告管理</h2>

    <div v-if="!backendSupport.adminAnnouncements" class="panel">
      <div class="notice-box">
        <strong>当前服务器还没有公告接口。</strong>
        <p>
          管理端公告需要查询、发布、编辑、撤回和删除接口。
          当前服务器访问 <code>/api/v1/announcements</code> 和
          <code>/api/v1/admin/announcements</code> 都返回 404。
        </p>
        <p>
          后端补好后，把
          <code>src/admin/config.ts</code>
          里的 <code>adminAnnouncements</code> 改成 <code>true</code>。
        </p>
      </div>
    </div>

    <template v-else>
      <div class="panel">
        <h3 class="panel-title">发布公告</h3>

        <div class="form-item">
          <label>标题</label>
          <input v-model="form.title" class="input" placeholder="请输入标题" />
        </div>

        <div class="form-item">
          <label>内容</label>
          <textarea
            v-model="form.content"
            class="textarea"
            rows="4"
            placeholder="请输入公告内容"
          />
        </div>

        <div class="form-item">
          <label>创建状态</label>
          <select v-model="form.status" class="select">
            <option value="published">立即发布</option>
            <option value="draft">保存草稿</option>
          </select>
        </div>

        <button
          class="button primary"
          type="button"
          @click="createAnnouncement"
        >
          提交
        </button>
      </div>

      <div class="panel">
        <h3 class="panel-title">公告列表</h3>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <p v-if="loading" class="empty-text">正在加载...</p>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>编号</th>
              <th>标题</th>
              <th>内容</th>
              <th>状态</th>
              <th>发布时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in announcements" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.content }}</td>
              <td>{{ announcementStatusText(item.status) }}</td>
              <td>{{ formatDate(item.created_at) }}</td>
              <td>
                <button
                  class="button small"
                  type="button"
                  @click="edit(item)"
                >
                  编辑
                </button>
                <button
                  class="button small"
                  type="button"
                  @click="
                    changeStatus(
                      item,
                      item.status === 'published' ? 'draft' : 'published',
                    )
                  "
                >
                  {{ item.status === 'published' ? '撤回' : '发布' }}
                </button>
                <button
                  class="button small danger"
                  type="button"
                  @click="remove(item)"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.panel-title {
  margin: 0 0 14px;
  color: #0f172a;
}
</style>
