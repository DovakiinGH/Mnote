<template>
  <div class="sub-window">
       <div class="sub-window-header top-bar">
      <span class=" app-title">{{ t('app.reminderWindow.title') }}</span>
      <el-button class="win-btn close" text @click="onSubmit">
          <el-icon><Close /></el-icon>
        </el-button>
    </div>
    <el-scrollbar class="sub-window-body">
        <p class="tip">{{ t('app.reminderWindow.text') }}</p>
        <div
          ref="editorRef"
          class="reminder-text-editor"
          spellcheck="false"
          data-placeholder="Reminder text..."
        ></div>
    </el-scrollbar>

    <div class="footer">
      <el-button @click="onSubmit">{{ t('app.settings.done') }}</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()

const route = useRoute()
const text = ref('')
const channel = ref('')
const editorRef = ref<HTMLElement | null>(null)

onMounted(async() => {
  text.value = String(route.query.text ?? '')
  channel.value = String(route.query.channel ?? '')  
  if (editorRef.value) editorRef.value.innerText = text.value
  const settings = await window.api.settingsGet()
  locale.value = settings.language
})

const onSubmit = async () => {
  await window.api.submitMandatoryReminder({ text: text.value }, channel.value)
}
</script>
<style scoped>
.reminder-mandatory {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.reminder-body {
  flex: 1;
  overflow: hidden;
  padding: 20px 24px;
  box-sizing: border-box;
}



.tip {
  margin-bottom: 8px;
}

.reminder-text-editor {
  min-height: 60px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}



</style>
