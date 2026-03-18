<template>
  <div class="reminder-mandatory">
    <el-scrollbar class="reminder-page-scroll">
      <div class="reminder-inner">
        <h2 class="reminder-titile">Reminder</h2>
        <p class="tip">Please handle this now:</p>

        <div
          ref="editorRef"
          class="reminder-text-editor"
          spellcheck="false"
          data-placeholder="Edit reminder text..."
        ></div>

        <div class="reminder-button">
          <el-button  @click="onSubmit">Done</el-button>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

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

<style scoped>
.reminder-mandatory {
  height: 100vh;
  overflow: hidden;
}
.reminder-titile{
    color:#3b4a63 ;
}

.reminder-page-scroll {
  height: 100%;
}

.reminder-inner {
  padding: 16px 20px;
  box-sizing: border-box;
}
.reminder-inner h2 {
  margin: 0 0 10px 0;   
}
.tip {
  color: #666;
  margin-bottom: 8px;
}

.reminder-text-editor {
  min-height: 120px;
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

.reminder-button {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.reminder-button :deep(.el-button) {
  background-color: #409EFF;
  border: #409EFF;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.18);
  
}
.reminder-button :hover{
  background-color: #fff;
  border-color: #409eff;
  color: #409eff;
}


</style>