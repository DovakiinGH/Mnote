<template>
    <div class="sub-window">
          <div class="sub-window-header top-bar">
      <span class="app-title">{{ t('app.note.quickNote') }}</span>
      <el-button class="win-btn close" text @click="onClose">
          <el-icon><Close /></el-icon>
        </el-button>
    </div>

    
    <div class="quick-content">
            <el-input
            v-model="selectedName"
            class="title-input"
            :placeholder="t('app.note.tilePlace')"
            maxlength="50"
            show-word-limit
            spellcheck="false"
          />
          <el-scrollbar  class="editor-scroll" >
            <el-input
              v-model="selectedContent"
              type="textarea"
              class="note-editor"
              :autosize="{ minRows: 10 }"
              spellcheck="false"
              :placeholder="t('app.note.placeHolder')"
            />
          </el-scrollbar>
    </div>
     <div class="footer">
      <el-button  @click="onSaveClose">{{ t('app.settings.done') }}</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref,onMounted } from 'vue'

import { useI18n } from 'vue-i18n'
const { t,locale } = useI18n()
onMounted(async() => {
  const settings = await window.api.settingsGet()
  locale.value = settings.language
})
const selectedName = ref('')
const selectedContent = ref('')
// import { watch } from 'vue'
// watch([selectedName, selectedContent], () => {
//   window.api.quickNoteUpdate({
//     title: selectedName.value,
//     content: selectedContent.value
//   })
// }, { immediate: true })
const onClose =async () => {
  window.api.quickNoteClose()
}
const onSaveClose =async () => {
   window.api.quickNoteUpdate({
    title: selectedName.value,
    content: selectedContent.value
  })
  window.api.quickNoteClose()
}
//callback(second input of watch) will be executed immediately when the watcher is created 
// (even if the variables haven't changed)
// ensuring that the initial values are also synchronized
</script>