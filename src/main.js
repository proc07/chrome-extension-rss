import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import './assets/main.css'
import ui from '@nuxt/ui/vue-plugin'

const app = createApp(App)

const router = createRouter({
  routes: [],
  history: createWebHistory()
})
app.use(router)
app.use(ui)
app.mount('#app')

// 监听页面刷新事件
window.addEventListener('load', () => {
  if (chrome.runtime) {
    // 暂时注释掉，因为会导致页面请去过多
    // chrome.runtime.sendMessage({ type: 'PAGE_REFRESH' });
  }
});