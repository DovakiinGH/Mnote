<template>
  <div class="reminder-mandatory">
    <el-scrollbar class="reminder-body">
      <div class="reminder-inner">
        <h2 class="reminder-title">Reminder</h2>
        <p class="tip">Please handle this now:</p>

        <div
          ref="editorRef"
          class="reminder-text-editor"
          spellcheck="false"
          data-placeholder="Reminder text..."
        ></div>
      </div>
    </el-scrollbar>

    <div class="reminder-footer">
      <el-button @click="onSubmit">Done</el-button>
    </div>
  </div>
</template>

<style scoped>
.reminder-mandatory {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.reminder-body {
  flex: 1;
  overflow: hidden;
}

.reminder-inner {
  padding: 16px 20px;
  box-sizing: border-box;
}

.reminder-title {
  color: #3b4a63;
  margin: 0 0 10px 0;
}

.tip {
  color: #666;
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

.reminder-text-editor:empty::before {
  content: attr(data-placeholder);
  color: #999;
}

.reminder-footer {
  padding: 12px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eee;
}

.reminder-footer :deep(.el-button) {
  background-color: #409eff;
  border: #409eff;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}

.reminder-footer :deep(.el-button:hover) {
  background-color: #fff;
  border-color: #409eff;
  color: #409eff;
}
</style>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const text = ref('')
const editorRef = ref<HTMLElement | null>(null)

onMounted(() => {
  text.value = String(route.query.text ?? '')
  if (editorRef.value) editorRef.value.innerText = text.value
})

const onSubmit = async () => {
  await window.api.submitMandatoryReminder({ text: text.value })
}
</script>