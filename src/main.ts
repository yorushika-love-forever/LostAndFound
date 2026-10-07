/**
 * main.ts —— 整个前端应用的「入口文件」（在 index.html 里被引入，只执行一次）。
 * 它负责把 Vue 应用启动起来，共三步：
 *   1) createApp(App)：以 App.vue 为根组件创建应用实例；
 *   2) app.use(router)：安装 vue-router 插件，让项目具备多页面导航能力；
 *   3) app.mount('#app')：把应用挂载到 index.html 的 <div id="app"> 上，页面才真正渲染。
 * 依赖：vue 的 createApp、@/App.vue（根组件）、@/router（路由实例）、两个全局样式文件。
 * 对外：不导出任何东西，只承担启动职责。
 */
import { createApp } from 'vue'//引入用于创建应用
import App from '@/App.vue'//引入App根组件
import router from '@/router'//引入路由器

// 样式文件也用 import 引入：Vite 会把它们抽出来打进最终的 CSS，无需在 index.html 里手写 <link>。
// base.css 是全局基础/重置样式；user.css 是学生端各页面的通用样式。
import '@/styles/base.css'
import '@/styles/user.css'

// createApp(App)：创建 Vue 应用，App 是整个页面最外层的根组件。
// use(router)：把路由插件安装到 Vue 中，这样模板里才能使用 RouterView、RouterLink。
// mount('#app')：把 Vue 应用挂载到 index.html 里的 <div id="app"> 元素。
// 注意顺序：use(router) 必须在 mount 之前执行——插件要在应用启动前装好，
// 否则首次渲染模板时 RouterView / RouterLink 还没被全局注册，会渲染失败。
const app = createApp(App)//创建一个应用
app.use(router)//使用路由器，main.ts 的`app.use(router)` — 执行后，Vue 会把这两个组件注册成全局组件，所以任何模板里都能直接写`<RouterLink>` /`<RouterView>`
app.mount('#app')//挂载整个应用到app容器中
