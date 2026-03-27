<template>
  <div class="pomodoro-window">
    <!-- 自定义标题栏 -->
    <div class="pomodoro-header">
      <span class="pomodoro-drag"></span>
      <button class="pomodoro-close" @click="onClose">×</button>
    </div>

    <div class="pomodoro-body">
      <div class="pomodoro-title">{{ title }}</div>
      <div class="pomodoro-timer">{{ displayTime }}</div>
      <div class="pomodoro-text">{{ text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'


const title = ref('')
const text = ref('')
const remainingSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

  import { formatDuration } from '../services/timeUtils'
const displayTime = computed(() => formatDuration(remainingSeconds.value))

const startCountdown = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (remainingSeconds.value <= 0) {
      if (timer) clearInterval(timer)
      window.api.pomodoroFinished()
      return
    }
    remainingSeconds.value--
  }, 1000)
}

const onClose = () => {
  window.close()
}

onMounted(() => {
  const hash = window.location.hash
  const search = hash.split('?')[1]
  if (search) {
    const params = new URLSearchParams(search)
    const raw = params.get('data')
    if (raw) {
      const data = JSON.parse(decodeURIComponent(raw))
      title.value = data.title
      text.value = data.text
      remainingSeconds.value = data.minutes * 60
      startCountdown()
    }
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.pomodoro-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(to right,#45a5fa,#3794EA,#317EC7);
  color: #fff;
  user-select: none;
    overflow: hidden;
}

.pomodoro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  -webkit-app-region: drag;     /* 可以拖动窗口 */
}

.pomodoro-drag {
  font-size: 12px;
  opacity: 0.7;
}

.pomodoro-close {
  -webkit-app-region: no-drag;  /* 按钮不参与拖动 */
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.pomodoro-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 内容区域 */
.pomodoro-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto; 
  overflow-x: auto; 
  scrollbar-width: none;  
}
.pomodoro-body::-webkit-scrollbar {
  display: none;  
}

.pomodoro-title {
  font-size: clamp(14px, 5vw, 24px);   /* 最小14px，最大24px，根据视口宽度5vw缩放 */
  font-weight: bold;
  margin-bottom: 16px;
}

.pomodoro-timer {
  font-size: clamp(36px, 15vw, 72px);  /* 最小36px，最大72px，15vw使其在宽屏上显著 */
  font-weight: bold;
  font-family: monospace;
  letter-spacing: 4px;
  margin-bottom: 16px;
}

.pomodoro-text {
  font-size: clamp(12px, 3vw, 16px);   /* 最小12px，最大16px，随视口宽度缓慢变化 */
  text-align: center;
  padding: 0 20px;
  max-width: 250px;
  word-wrap: break-word;
}
</style>
<style>
html, body {
  overflow: hidden !important;
  margin: 0;
  padding: 0;
}
</style>