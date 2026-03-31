<template>
  <div class="sub-window">
    <div class="sub-window-header top-bar">
      <span class="app-title">{{ t('app.settings.title') }}</span>
      <el-button class="win-btn close" text @click="onClose">
          <el-icon><Close /></el-icon>
        </el-button>
    </div>

    <el-scrollbar class="sub-window-body">
      <el-form label-position="left" label-width="160px" class="settings-form">

        <el-form-item :label="t('app.settings.language')">
          <el-select v-model="form.language" @change="onLanguageChange">
            <el-option label="English" value="en-US" />
            <el-option label="中文" value="zh-CN" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('app.settings.closeAction')">
          <el-select v-model="form.closeAction">
            <el-option :label="t('app.settings.closeActionQuit')" value="quit" />
            <el-option :label="t('app.settings.closeActionTray')" value="tray" />
          </el-select>
        </el-form-item>

      </el-form>
    </el-scrollbar>
    <div class="footer">
      <el-button  @click="onClose">{{ t('app.settings.done') }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const form = reactive({
  language: 'en',
  closeAction: 'tray',
})

onMounted(async () => {
  const settings = await window.api.settingsGet()
  form.language = settings.language
  form.closeAction = settings.closeAction
  locale.value = form.language
})

const onLanguageChange = (lang: string) => {
  locale.value = lang
}

const onClose = async () => {
  await window.api.settingsSave({
    language: form.language,
    closeAction: form.closeAction,
  })
  await window.api.settingsClose()
}
</script>

<style scoped>


.settings-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.settings-form :deep(.el-select) {
  width: 200px;
}

</style>