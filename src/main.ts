import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/base.css'
import './styles/user.css'

// createApp(App)：创建 Vue 应用，App 是整个页面最外层的根组件。
// use(router)：把路由插件安装到 Vue 中，这样模板里才能使用 RouterView、RouterLink。
// mount('#app')：把 Vue 应用挂载到 index.html 里的 <div id="app"> 元素。
createApp(App).use(router).mount('#app')
