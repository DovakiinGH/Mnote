<template>
  <el-scrollbar class="milkdown-scroll">
  <Milkdown spellcheck="false"/>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { Milkdown, useEditor, useInstance } from '@milkdown/vue'
import { Crepe } from '@milkdown/crepe'
import { getMarkdown, replaceAll } from '@milkdown/kit/utils'

import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

const props = defineProps<{
  defaultValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

let internalChange = false
const [loading, getInstance] = useInstance()

let lastMarkdown = props.defaultValue || ''
let pollTimer: ReturnType<typeof setInterval> | null = null

const startPolling = () => {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (loading.value) return
    const editor = getInstance()
    if (!editor) return

    try {
      const current = editor.action(getMarkdown())
      if (current !== lastMarkdown) {
        lastMarkdown = current
        internalChange = true
        emit('update', current)
        setTimeout(() => { internalChange = false }, 0)
      }
    } catch {
    }
  }, 300)
}

useEditor((root) => {
  return new Crepe({
    root,
    defaultValue: props.defaultValue || '',
    features: {
      'list-item': true,
      'link-tooltip': true,
      'block-edit': true,
      'placeholder': false,
      'toolbar': true,
      'image-block': false,
      'cursor': true,
      'table': true,
      'code-mirror': true,
    },
    featureConfigs: {
      placeholder: {
        text: 'Write something...',
      },
    },
  })
})

watch(loading, (isLoading) => {
  if (!isLoading) {
    startPolling()
  }
})
watch(
  () => props.defaultValue,
  (newVal) => {
    if (internalChange) return
    if (loading.value) return

    const editor = getInstance()
    if (!editor) return

    try {
      const currentVal = editor.action(getMarkdown())
      if (currentVal === newVal) return
      lastMarkdown = newVal ?? ''
      editor.action(replaceAll(newVal ?? ''))
    } catch (e) {
      console.warn('[MilkdownEditor] replaceAll failed:', e)
    }
  }
  
)

import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
</script>

<style>
.milkdown-scroll {
  height: 100%;
}

.milkdown {
  overflow: visible !important;
  padding: 12px;
  outline: none;
}

.milkdown .editor {
  outline: none;
  min-height: 300px;
}

.milkdown em {
  font-style: italic;
}

/* 菜单文字缩小 */
.milkdown-slash-menu * {
  font-size: 1.2cqh !important;
  line-height: 1.2 !important;
    padding: 0;
}
.milkdown-slash-menu li,
.milkdown-slash-menu [role="option"],
.milkdown-slash-menu [class*="item"] {
  padding: clamp(0px, 0.1cqw, 6px) clamp(0px, 1cqw, 12px) !important;
  min-height: unset !important;
}

.milkdown-slash-menu [class*="tab"],
.milkdown-slash-menu [role="tab"] {
   padding: clamp(0px, 0.1cqw, 6px) clamp(0px, 0.5cqw, 12px) !important;
    font-size: 1.4cqh !important;
}



.milkdown *::-webkit-scrollbar {
  width: 6px;
  height: 3px;
}

.milkdown *::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 3px;
}

.milkdown *::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

.milkdown *::-webkit-scrollbar-track {
  background-color: transparent;
}
.milkdown .ProseMirror p.is-editor-empty:first-child::before,
.milkdown .ProseMirror .is-empty::before,
.milkdown [data-placeholder]::before {
  content: attr(data-placeholder) !important;
}

</style>