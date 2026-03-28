<template>
  <div class="settings-window">
    <!-- 自定义标题栏 -->
    <div class="settings-header top-bar">
      <span class="settings-drag app-title">{{ t('app.settings.title') }}</span>
      <button class="settings-close-btn" @click="onDone">×</button>
    </div>

    <!-- 内容区域 -->
    <el-scrollbar class="settings-body">
      <el-form label-position="left" label-width="160px" class="settings-form">

        <!-- 语言 -->
        <el-form-item :label="t('app.settings.language')">
          <el-select v-model="form.language" @change="onLanguageChange">
            <el-option label="English" value="en" />
            <el-option label="中文" value="zh" />
          </el-select>
        </el-form-item>

        <!-- 关闭行为 -->
        <el-form-item :label="t('app.settings.closeAction')">
          <el-select v-model="form.closeAction">
            <el-option :label="t('app.settings.closeActionQuit')" value="quit" />
            <el-option :label="t('app.settings.closeActionTray')" value="tray" />
          </el-select>
        </el-form-item>

      </el-form>
    </el-scrollbar>
    <div class="footer">
      <el-button  @click="onDone">{{ t('app.settings.done') }}</el-button>
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

onMounted(() => {
  // 从 URL 参数读取当前设置
  const hash = window.location.hash
  const search = hash.split('?')[1]
  if (search) {
    const params = new URLSearchParams(search)
    const raw = params.get('data')
    if (raw) {
      const data = JSON.parse(decodeURIComponent(raw))
      form.language = data.language ?? 'en'
      form.closeAction = data.closeAction ?? 'tray'
      locale.value = form.language
    }
  }
})

const onLanguageChange = (lang: string) => {
  locale.value = lang
}

const onDone = async () => {
  await window.api.settingsSave({
    language: form.language,
    closeAction: form.closeAction,
  })
  await window.api.settingsClose()
}
</script>

<style scoped>
.settings-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
  user-select: none;
  overflow: hidden;
}

/* 标题栏 */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  -webkit-app-region: drag;
  height: 8vh;
}


.settings-close-btn {
  -webkit-app-region: no-drag;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #ffffff;
}

.settings-close-btn:hover {
  background: #e4e7ed;
}

.settings-body {
  flex: 1;
  padding: 20px 24px;
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.settings-form :deep(.el-select) {
  width: 200px;
}

</style>