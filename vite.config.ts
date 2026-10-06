import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
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
        target: 'http://121.40.225.123:8080',
        changeOrigin: true,
      },
      // 帖子图片由后端的 /uploads 静态目录提供，且后端只保存相对路径 /uploads/...，
      // 开发环境同样代理过去，保证 <img> 能同源加载到图片。
      '/uploads': {
        target: 'http://121.40.225.123:8080',
        changeOrigin: true,
      },
    },
  },
})
