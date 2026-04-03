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

        <el-form-item :label="t('app.settings.autoLaunch')">
          <el-select v-model="form.autoLaunch" @change="onAutoLaunchChange">
            <el-option :label="t('app.settings.autoLaunchTrue')" :value="true" />
            <el-option :label="t('app.settings.autoLaunchFalse')" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('app.settings.shortcut')">
           <div
            class="shortcut-input"
            :class="{ recording: isRecording }" 
            tabindex="0" 
            @click="startRecording"
            @keydown.prevent="onKeyDown"
            @blur="stopRecording"
            ref="shortcutRef"
          >
            <span v-if="isRecording" class="recording-hint">
              {{ t('app.settings.shortcutRecording') }}
            </span>
            <span v-else class="shortcut-display">
              {{ form.shortCut || t('app.settings.shortcutNone') }}
            </span>
            <el-button
              v-if="form.shortCut && !isRecording"
              class="shortcut-clear"
              text
              size="small"
              @click.stop="clearShortcut"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </el-form-item>

      </el-form>
    </el-scrollbar>
    <div class="footer">
      <el-button  @click="onClose">{{ t('app.settings.done') }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref,onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

const form = reactive({
  language: 'en',
  closeAction: 'tray',
  autoLaunch: false,
  shortCut: 'Ctrl+Shift+Space',
})

onMounted(async () => {
  const settings = await window.api.settingsGet()
  form.language = settings.language
  form.closeAction = settings.closeAction
  locale.value = form.language
  form.autoLaunch = settings.autoLaunch
  form.shortCut = settings.shortCut || ''
})

const onLanguageChange = (lang: string) => {
  locale.value = lang
}
const onAutoLaunchChange = async (val: boolean) => {
  await window.api.setAutoLaunch(val)
}
const onClose = async () => {
  await window.api.settingsSave({
    language: form.language,
    closeAction: form.closeAction,
    autoLaunch: form.autoLaunch,
    shortCut: form.shortCut,
  })
  await window.api.settingsClose()
}
// for shortcut recording
const isRecording = ref(false)
const shortcutRef = ref<HTMLElement | null>(null)

async function startRecording() {
  await window.api.stopShortcut()
  isRecording.value = true
  shortcutRef.value?.focus()
  //let the template element get the focus of keyboard;  listening to keydown events
}
async function stopRecording() {
  isRecording.value = false
  await window.api.resumeShortcut()
}

//every press of key will trigger this function
function onKeyDown(e: KeyboardEvent) {
  if (!isRecording.value) return
  e.preventDefault()
  e.stopPropagation()
  // when input modifierKeys alone, do not record, just wait for the next key
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta']
  if (modifierKeys.includes(e.key)) return
  // Esc to cancel recording
  if (e.key === 'Escape') {
    isRecording.value = false
    return
  }
  // at least one modifier key 
  if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) return

  // compose the shortcut string, like Ctrl+Shift+Space
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  if (e.metaKey) parts.push('Super')
  // key name normalization: Space → Space, ArrowUp → Up, a → A, Numpad1 → num1,......
  const keyName = normalizeKey(e.key, e.code)
  parts.push(keyName)
  form.shortCut = parts.join('+')  // use + to connect keys, like Ctrl+Shift+Space
  isRecording.value = false
}
function normalizeKey(key: string, code: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Tab': 'Tab',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'Insert': 'Insert',
  }
  if (keyMap[key]) return keyMap[key]
  // F1~F12
  if (/^F\d{1,2}$/.test(key)) return key  // ^starts with F, \d{1,2} followed by 1 or 2 digits, $ and nothing else
  // single character keys
  if (key.length === 1 && /[a-zA-Z]/.test(key)) return key.toUpperCase()
  // number keys
  if (key.length === 1 && /[0-9]/.test(key)) return key
  // Numpad keys 小键盘数字
  if (code.startsWith('Numpad')) {
    return 'num' + code.replace('Numpad', '') //'Numpad1'.replace('Numpad', '') → '1'  
    //'Numpad1' → 'num1'
  }
  // symbol keys, like Minus → -
  const codeMap: Record<string, string> = {
    'Minus': '-',
    'Equal': '=',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Backquote': '`',
  }
  if (codeMap[code]) return codeMap[code]
  return key
}
function clearShortcut() {
  form.shortCut = ''
}
</script>

<style scoped>


.settings-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.settings-form :deep(.el-select) {
  width: 200px;
}
.shortcut-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  outline: none;
}
.shortcut-input:hover {
  border-color: var(--el-color-primary);
}
.shortcut-input:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}
.shortcut-input.recording {
  border-color: var(--el-color-warning);
  box-shadow: 0 0 0 1px var(--el-color-warning) inset;
  background-color: var(--el-color-warning-light-9);
}
.recording-hint {
  color: var(--el-color-warning);
  font-size: 13px;
  animation: blink 1s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.shortcut-display {
  font-size: 13px;
  color: var(--el-text-color-regular);
  letter-spacing: 0.5px;
}
.shortcut-clear {
  margin-left: 8px;
  color: var(--el-text-color-placeholder);
}
</style>