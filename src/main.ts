import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import './style.css'
import App from './App.vue'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import *as ElementPlusIconsVue from '@element-plus/icons-vue'
import './styles/base.css'
import './styles/app.css'
import router from './router'

const app = createApp(App)

const savedLang = localStorage.getItem('lang') || 'en-US'
const i18n = createI18n({
  legacy: false,
  locale: savedLang,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

for(const [key,component] of Object.entries(ElementPlusIconsVue)){
  app.component(key,component)
}

app.use(i18n)
app.use(ElementPlus)
app.use(router)
app.mount('#app')

app.config.globalProperties.$nextTick(() => {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})

