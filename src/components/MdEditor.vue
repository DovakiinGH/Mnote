<template>
  <div class="md-editor-wrapper">
    <MilkdownProvider>
      <MilkdownEditor
        :defaultValue="modelValue"
        :disabled="disabled"
        @update="onUpdate"
      />
    </MilkdownProvider>
  </div>
</template>

<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue'
import MilkdownEditor from './MilkdownEditor.vue'

defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const onUpdate = (markdown: string) => {
  emit('update:modelValue', markdown)
}
</script>

<style scoped>
.md-editor-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

</style>