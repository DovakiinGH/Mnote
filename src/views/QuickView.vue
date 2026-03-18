<template>
  <div class="quick-content">
          <el-input
          v-model="selectedName"
          class="title-input"
          placeholder="Input the tile"
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
            placeholder="Write some thing..."
          />
        </el-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { computed, onMounted } from 'vue'
import { watch } from 'vue'

const selectedName = ref('')
const selectedContent = ref('')
watch([selectedName, selectedContent], () => {
  window.api.quickNoteUpdate({
    title: selectedName.value,
    content: selectedContent.value
  })
}, { immediate: true })
//callback(second input of watch) will be executed immediately when the watcher is created 
// (even if the variables haven't changed)
// ensuring that the initial values are also synchronized
</script>