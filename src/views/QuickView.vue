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
      <MdEditor v-model="selectedContent" :minimal="true"/>
    </div>

    <div class="footer">
      <el-button @click="onSaveClose">{{ t('app.settings.done') }}</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import MdEditor from '../components/MdEditor.vue'

const { t, locale } = useI18n()

onMounted(async () => {
  const settings = await window.api.settingsGet()
  locale.value = settings.language
})

const selectedName = ref('')
const selectedContent = ref('')

const onClose = async () => {
  window.api.quickNoteClose()
}

const onSaveClose = async () => {
  window.api.quickNoteUpdate({
    title: selectedName.value,
    content: selectedContent.value
  })
  window.api.quickNoteClose()
}
</script>
<style scoped>
.quick-content :deep(.milkdown) {
  padding-left: 10px !important;
  padding-top: 10px !important;
}
.quick-content :deep(.ProseMirror) {
  padding-left: 10px !important;
  margin-left: 10px !important;
}
</style>