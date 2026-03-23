<template>
  <Editor
    v-model="content"
    :language="language"
    :placeholder="placeholder"
    :toolbars="toolbars"
    :showCodeRowNumber="true"
    :noMermaid="true"
    :noKatex="true"
    :tabWidth="2"
    :autoFocus="false"
    previewTheme="github"
    codeTheme="github"
    class="md-editor"
    @onSave="onSave"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MdEditor as Editor } from 'md-editor-v3'
import type { ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  placeholder?: string
  language?: string
  
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}>()

const content = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const language = computed(() => props.language || 'en-US')
const placeholder = computed(() => props.placeholder || '')

const toolbars: ToolbarNames[] = [
  'bold',
  'underline',
  'italic',
  'strikeThrough',
  '-',
  'title',
  'quote',
  '-',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'table',
  '-',
  'revoke',
  'next',
  '=',
  'preview',
  'pageFullscreen',
]

const onSave = () => {
  emit('save')
}
</script>

<style scoped>
.md-editor {
  height: 100%;
  width: 100%;
}


/* 强制斜体生效 */
.md-editor :deep(em) {
  font-style: italic !important;
  display: inline-block;
  transform: skewX(-8deg);
}
</style>
