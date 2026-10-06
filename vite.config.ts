import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv 会依次读取 .env / .env.[mode] / .env.[mode].local，第三个参数限定只取 VITE_ 前缀的变量。
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // 开发时 /api、/uploads 转发到哪个后端：默认本机 8080。
  // 需要连远程后端时，新建 .env.development.local（已被 .gitignore 的 *.local 规则忽略）写
  // VITE_PROXY_TARGET=http://你的服务器IP:8080 覆盖即可，避免把服务器地址写死进仓库。
  const backend = env.VITE_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      proxy: {
        // 后端路由前缀本身就是 /api/v1，转发时必须保持路径原样。
        // 之前这里的 rewrite 会把 /api/v1/posts 改写成 /v1/posts，后端没有该路由，必然 404。
        '/api': {
          target: backend,
          changeOrigin: true,
        },
        // 帖子图片由后端的 /uploads 静态目录提供，且后端只保存相对路径 /uploads/...，
        // 开发环境同样代理过去，保证 <img> 能同源加载到图片。
        '/uploads': {
          target: backend,
          changeOrigin: true,
        },
      },
    },
  }
})
