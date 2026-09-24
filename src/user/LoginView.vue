<template>
  <div class="login-box">
    <h2>校园失物招领 - 用户登录</h2>

    <!-- 学号输入 -->
    <div class="input-item">
      <label>学号：</label>
      <input v-model="studentId" type="text" placeholder="请输入学号" />
    </div>

    <!-- 密码输入 -->
    <div class="input-item">
      <label>密码：</label>
      <input v-model="password" type="password" placeholder="请输入密码" />
    </div>

    <!-- 错误提示 v-if 控制显示 -->
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <button @click="handleLogin" class="login-btn">登录</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// 导入你封装好的登录api（src/api/auth.ts）
import { loginApi } from '@/api/auth'

const router = useRouter()

// 绑定输入框 v-model
const studentId = ref('')
const password = ref('')
const errorMsg = ref('')

// 登录点击事件
const handleLogin = async () => {
  // 清空上次错误
  errorMsg.value = ''
  if (!studentId.value || !password.value) {
    errorMsg.value = '学号和密码不能为空'
    return
  }

  try {
    // 调用后端登录接口
    const res = await loginApi({
      studentId: studentId.value,
      password: password.value
    })

    // 保存token 到localStorage
    localStorage.setItem('token', res.token)
    // 保存用户信息
    localStorage.setItem('userInfo', JSON.stringify(res.user))

    // 登录成功跳转到首页
    router.push('/')

  } catch (err: any) {
    // 展示后端返回的错误信息
    errorMsg.value = err.message || '登录失败，学号或密码错误'
  }
}
</script>

<style scoped>
.login-box {
  width: 360px;
  margin: 100px auto;
  padding: 30px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.input-item {
  margin:16px 0;
}
input {
  width:100%;
  padding:8px;
  margin-top:4px;
  box-sizing: border-box;
}
.login-btn {
  width:100%;
  padding:10px;
  background:#409eff;
  color:white;
  border:none;
  border-radius:4px;
  cursor:pointer;
}
.error {
  color:yellow;
}
</style>
