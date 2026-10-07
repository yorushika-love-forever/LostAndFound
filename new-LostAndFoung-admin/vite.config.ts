import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET

  return {
    // 子路径部署：管理端与主工程（学生端）共用同一个域名，需挂在 /admin/ 下。
    // 不加这一行时，打包产物里的资源引用会是 /assets/xxx.js，与主工程的同名文件
    // 冲突（互相覆盖，两边页面都会白屏）；加上后变成 /admin/assets/xxx.js。
    // 路由仍保持 createWebHistory() 不带 base——路由表本身已带 /admin 前缀，
    // 与 base 拼接后正好是 /admin/xxx，因此 401 跳转里的硬编码 /admin/login 也依然正确。
    base: '/admin/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: proxyTarget
      ? {
          proxy: {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  }
})
