
<template>
  <el-container class="app">
    <!-- top part-->
    <el-header class="top-bar">
      <div class="app-title">{{ t('app.title') }}</div>
      <div class="window-actions">
        <el-button class="win-btn" text @click="onMinimize">
          <el-icon><Minus /></el-icon>
        </el-button>

        <el-button class="win-btn" text @click="onToggleMaximize">
          <el-icon>
            <CopyDocument />
          </el-icon>
        </el-button>

        <el-button class="win-btn close" text @click="onClose">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </el-header>

  <el-container class="body">

      <!-- side menu part----------------------------------------------------------------------------->
    <el-aside :width="isCollapse ? '5vw' : '20vw'"class="side">
      <el-radio-group v-model="isCollapse" >
        <el-button
          v-if="isCollapse"
          class="side-btn side-open side-hit"
          @click="isCollapse = false"
          text
          >
          <el-icon><ArrowRight /></el-icon>
        </el-button>

        <el-button
          v-else
          class="side-btn side-close"
          @click="isCollapse = true"
          text>
          <el-icon><ArrowLeft /></el-icon>
        </el-button>

        <el-button
        class="gear-btn side-btn "
        text
        @click="onOpenSettings">
        <el-icon><Setting /></el-icon>
        </el-button>

      </el-radio-group>

      <el-menu
      v-show="!isCollapse"
        :default-active="activeCategoryIndex"
        class="el-menu-vertical"
        :collapse="isCollapse"
        @select="onSelectSideMenu"
    
      >
        <el-menu-item index="1">
          <template #title>
            <span>{{ t('app.notes') }}</span>
          </template>
        </el-menu-item>
        <el-menu-item index="2">
          <template #title>{{ t('app.reminders') }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <!-- side menu end-->

    <!-- sub side menu part------------------------------------------------------------------------------------------>
    <el-aside
      :class="['sub-side', { 'sub-collapse': !isSubOpen }]"
      :width="isSubOpen ? '22vw' : '0px'"
    >      
        <div class="sub-header">

              <el-button class="new-btn"  @click="onNewItem" >
                <span class="new-icon">
                  <el-icon class="plus-icon"><Plus /></el-icon>
                </span>              
                <span class="new-text">{{ t('app.button.new') }}</span>
              </el-button>      

        </div>

        <el-scrollbar class="sub-list">        
          <div
            v-for="item in currentSubListItems"
            :key="item.id"
            class="sub-item"
            :class="{ 
              active: item.id === selectedSubId,
              'is-confirm': item.id === confirmDeleteId,
              'is-running': isReminderActive(item.id)
              }"
            @click="onSubListItemClick(item.id)"
            >
            <!-- sub list items --------------------------->
             <!--text -->
            <div class="item-content">
              {{ item.name }}
            </div>
            <div  v-if="activeCategoryIndex === '1'" class="item-preview">
            {{ getPreview(item.contentId) }}
            </div>
            <div v-if="activeCategoryIndex === '2'" class="item-preview">
              {{ getReminderPreview(item.id) }}
            </div>
            <!-- buttons -->
            <el-button
              v-if="item.id !== confirmDeleteId"
              class="item-del-btn"
              text
              :disabled="isReminderActive(item.id)"
              @click.stop="onDeleteItem(item.id)"
            >
            <el-icon class="item-del-icon"><Delete /></el-icon>
            </el-button>

            <el-button
              v-if="item.id !== confirmDeleteId"
              class="item-pin-btn"
              :class="{ 'is-pinned': item.pinned }"
              text
              @click.stop="onTogglePin(item)"
            >
              <el-icon v-if="item.pinned==false" class="item-pin-icon"><Star /></el-icon>
              <el-icon v-if="item.pinned==true" class="item-pin-icon"><StarFilled /></el-icon>
            </el-button>
            
            <div v-if="item.id === confirmDeleteId" class="item-confirm">
              <el-button class="btn-confirm" @click.stop="onConfirmDelete(item.id)">{{ t('app.button.confirm') }}</el-button>
              <el-button class="btn-cancel" @click.stop="onCancelDelete">{{ t('app.button.exit') }}</el-button>
            </div>
          </div>
        </el-scrollbar>
        <!-- bottom of list -->
        <div class="sub-end">
            <el-input
              v-model="searchQuery"
              class="search-input"
              :placeholder="t('app.button.search')"
              clearable
              :prefix-icon="Search"
            />
          <el-button
              class="side-btn side-close"
            @click="onSubSideEndClick"
              text>
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
        </div>
    </el-aside>
    <!-- sub side menu end-->

    <!-- content part-------------------------------------------------------------------------------------->
    <el-main class="content">
      <el-scrollbar class="tab-bar-scroll" horizontal @wheel.prevent="onTabWheel">
      <div class="tab-bar" v-if="tabs.length">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: tab.key === activeTabKey }"
          draggable="true"
          @dragstart="onDragStart(tab.key)"
          @dragover.prevent
          @drop="onDrop(tab.key)"
          @click="activateTab(tab.key)"
        >
          <span class="tab-title">{{ getTabTitle(tab) }}</span>
          <span class="tab-close" @click.stop="closeTab(tab.key)">×</span>
        </div>
      </div>
      </el-scrollbar>

      <div v-if="activeContentItem" class="content-inner">
        <div class="title-wheel-box" @wheel.prevent="onTitleWheel">
          <el-input
            v-model="selectedName"
            class="title-input"
            :placeholder="t('app.note.tilePlace')"
            maxlength="50"
            show-word-limit
            spellcheck="false"
          />
        </div>
        <div class="time-lines">
          <div class="note-time">
            <div class="time-left">
            <div class="time-line">
              {{ activeContentItem?.createAt ? formatTime(activeContentItem.createAt) : '--' }}
            </div>
            <div class="time-line">
              {{ activeContentItem?.updatedAt ? formatTime(activeContentItem.updatedAt) : '--' }}
            </div>
            </div>
          </div>
          <div v-if="activeTab?.type === 'reminders'" class="time-right">
            <div class="time-line">{{ t('app.reminderButton.lastTriggered') }}</div>
            <div class="time-line">
              {{ activeReminderItem?.lastTriggeredAt ? formatTime(activeReminderItem.lastTriggeredAt) : '--' }}          
            </div>
          </div>
        </div>
        <!-- note----------------------------------------------------------------------------------------------------->
         
            <MdEditor v-if="activeTab?.type === 'notes'"
              v-model="selectedContent"
            />
          

    <!-- note----------------------------------------------------------------------------------------------------->
      <!-- reminders ------------------------------------------------------------------------------------- -->
      <div v-else>
    <div class="reminder-panel" :class="{ 'is-locked': isReminderLocked }">
      <!-- only this stays enabled -->
      <div class="reminder-status">
        <el-radio-group v-model="currentReminderForm.enabled"
        @change="onEnabledChange">
          <el-radio-button :label="true">{{ t('app.reminderButton.start') }}</el-radio-button>
          <el-radio-button :label="false">{{ t('app.reminderButton.close') }}</el-radio-button>
        </el-radio-group>
      </div>
       <!-- select mode-->
      <div class="reminder-mode lockable">
        <el-select
          v-model="currentReminderForm.mode"
          placeholder="choose reminder mode"
          :disabled="isReminderLocked"
          @change="onModeChange"
        >
          <el-option :label="t('app.reminderButton.notification')" value="NOTIFICATION" />
          <el-option :label="t('app.reminderButton.popUpWindow')" value="POPUP_WINDOW" />
           <el-option :label="t('app.reminderButton.pomodoro')" value="POMODORO" />
        </el-select>
      </div>
      <!-- select type and related settings -->
      <el-select
        v-model="currentReminderForm.type"
        placeholder="choose type"
        :disabled="isReminderLocked|| currentReminderForm.mode === 'POMODORO'"
        class="lockable"
      >
        <el-option v-for="rt in REMINDER_TYPES" :key="rt.key" :label="t(rt.labelKey)" :value="rt.key" />
      </el-select>

      <template v-if="currentReminderForm.type === 'AFTER_MINUTES'">
        <el-input-number
          v-model="currentReminderForm.minutes"
          :min="1"
          :max="1440"
          :disabled="isReminderLocked"
          class="lockable"
        />
      </template>

      <template v-else-if="currentReminderForm.type === 'DATE_TIME'">
        <el-date-picker
          v-model="currentReminderForm.date"
          type="date"
          :placeholder="t('app.reminderButton.date')"
          :disabled="isReminderLocked"
          :disabled-date="disablePastDate"
          class="lockable"
          placement="top-start"
          :teleported="true"
          :popper-options="{
            strategy: 'fixed',
            modifiers: [
              { name: 'preventOverflow', options: { boundary: 'viewport', padding: 8 } },
              { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }
            ]
          }"
          value-format="YYYY-MM-DD"
        />
        <el-time-picker
          v-model="currentReminderForm.time"
          :placeholder="t('app.reminderButton.time')"
          :disabled="isReminderLocked"
          class="lockable"
          value-format="HH:mm:ss"
          :disabled-hours="disabledHours"
          :disabled-minutes="disabledMinutes"
        />
      </template>

      <template v-else-if="currentReminderForm.type === 'EVERY_DAYS'">
        <el-input-number
          v-model="currentReminderForm.days"
          :min="1"
          :max="365"
          :disabled="isReminderLocked"
          class="lockable"
        />
        <el-time-picker
          v-model="currentReminderForm.time"
          placeholder="Select time(optional)"
          :disabled="isReminderLocked"
          class="lockable"
          value-format="HH:mm:ss"
        />
      </template>

       <el-scrollbar class="reminder-text-scroll lockable">
        <el-input
          v-model="currentReminderForm.text"
          type="textarea"
          :rows="6"
          maxlength="500"
          show-word-limit
          class="reminder-textarea"
          :placeholder="t('app.reminderButton.text')"
          :disabled="isReminderLocked"
        />
      </el-scrollbar>
    </div>
      </div>
    </div>

    <div v-else class="empty-placeholder">{{ t('app.emptySpace') }}</div>
    </el-main>

  </el-container>
    <!-- body end -->
  </el-container>
  <!-- app end  -->
</template>




<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { computed, onMounted } from 'vue'
import { watch } from 'vue'
import MdEditor from '../components/MdEditor.vue'
import type { NoteItem, ReminderItem, TabType } from '../types/mainView'
import {REMINDER_TYPES} from '../services/reminderUtils'
import { formatTime } from '../services/timeUtils'
import { useWheelScroll } from '../composables/useWheelScroll'
import { getPreview as getTextPreview } from '../services/markdownPreview'
import { useReminderForm } from '../composables/useReminder'
import { Search } from '@element-plus/icons-vue'
import { useDataStore } from '../composables/useDataStore'

const { onTabWheel, onTitleWheel } = useWheelScroll()


const { t, locale } = useI18n()
const activeCategoryIndex = ref('1')
const isCollapse = ref(true)
const isSubOpen = ref(true)
const selectedSubId = ref<number | null>(null)

const currentCloseAction=ref('tray')
const tabs = ref<Tab[]>([])
const activeTabKey = ref<string | null>(null)

const onMinimize = () => window.api.windowMinimize()
const onToggleMaximize = () => window.api.windowToggleMaximize()
const onClose = () => window.api.windowClose()
const searchQuery = ref('')
const {
     dataMap,
    contentStore,
    reminderStore,
    loadNotes,
    loadReminders,
    saveReminder,
    scheduleSave,
    scheduleSaveReminder,
    registerSaveBeforeClose,
    registerDataChangeListeners
} = useDataStore()

onMounted(async () => {
  await loadNotes()
  await loadReminders()

  registerDataChangeListeners()

  registerSaveBeforeClose()

  const settings = await window.api.settingsGet()
  locale.value = settings.language
  currentCloseAction.value = settings.closeAction
  window.api.onSettingsChanged((settings) => {
    locale.value = settings.language
    currentCloseAction.value = settings.closeAction
  })
})

//--------------------------------add new item------------------------------------------------------------

const onNewItem = async () => {
  if (currentCategoryName.value === 'notes') {
    const n = await window.api.notesCreate()
    await loadNotes()
    selectedSubId.value = Number(n.id)
    onSubListItemClick(Number(n.id))
    return
  }
  const r = await window.api.reminderCreate()
  await loadReminders()
  selectedSubId.value = Number(r.id)
  onSubListItemClick(Number(r.id))
}

//--------------------------------handleing side menus-----------------------------------------------------------------
// the main side menu
const onSelectSideMenu = (index: string) => {
  activeCategoryIndex.value = index
   isSubOpen.value = true

  const type = index === '1' ? 'notes' : 'reminders'
  const tab = tabs.value.find(t => t.type === type)
  if (tab) {
    activeTabKey.value = tab.key
    selectedSubId.value = tab.itemId
  } else {
    selectedSubId.value = null
  }
}
//the arrow button on the end of sub side menu
const onSubSideEndClick=() => {
  isCollapse.value=true
  isSubOpen.value = false
}


const currentCategoryName = computed<'notes'|'reminders'>(() => {
  return activeCategoryIndex.value === '1' ? 'notes' : 'reminders'
})  

const currentSubListItems = computed(() => {
  const list = currentCategoryName.value === 'notes' ? sortedNotes.value: sortedReminders.value
  const q = searchQuery.value
  if (!q || !normalizeForSearch(q)) return list
  return list.filter(item => {
    if (matchSearch(item.name ?? '', q)) return true
    if (currentCategoryName.value === 'notes') {
      const content = contentStore.value[item.contentId] ?? ''
      if (matchSearch(content, q)) return true
    }
    if (currentCategoryName.value === 'reminders') {
      const form = reminderStore.value[item.id]
      if (form && matchSearch(form.text ?? '', q)) return true
    }
    return false
  })
})

//-----------------------------------Tabs----------------------------------------------------------
type Tab = {
  key: string
  type: TabType
  itemId: number
}
const getTabTitle = (tab: Tab) => {
  const list = dataMap.value[tab.type]
  return list.find(i => i.id === tab.itemId)?.name ?? 'Untitled'
}
//create tab id
const makeTabKey = (type: TabType, id: number) => `${type}-${id}`

// click sub list item, open or switch to the tab, and update selectedSubId
const onSubListItemClick = (id: number) => {
  selectedSubId.value = id
  
  const type: TabType = currentCategoryName.value
  const key = makeTabKey(type, id)
  // makesure tab exists
  if (!tabs.value.find(t => t.key === key)) {
    tabs.value.push({ key, type, itemId: id })
  }
  // change activeTabKey; let that tab be active
  activeTabKey.value = key
} 

// return the active tab based on activeTabKey
const activeTab = computed(() => {
  return tabs.value.find(t => t.key === activeTabKey.value) || null
}) 
// activate a tab by key, update activeTabKey, activeCategoryIndex and selectedSubId 
const activateTab = (key: string) => {
  activeTabKey.value = key
  const tab = tabs.value.find(t => t.key === key)
  if (!tab) return
  activeCategoryIndex.value = tab.type === 'notes' ? '1' : '2'
  selectedSubId.value = tab.itemId
} 

const activeContentItem = computed(() => {
  if (!activeTab.value) return null
  const list = dataMap.value[activeTab.value.type]
  return list.find(i => i.id === activeTab.value!.itemId) || null
}) 
const activeReminderItem = computed<ReminderItem | null>(() => {
  if (activeTab.value?.type !== 'reminders') return null
  const item = dataMap.value.reminders.find(i => i.id === activeTab.value!.itemId)
  return item ?? null
})

const closeTab = (key: string) => {
  const idx = tabs.value.findIndex(t => t.key === key)
  if (idx === -1) return

  tabs.value.splice(idx, 1)

  if (activeTabKey.value === key) {
    activeTabKey.value = tabs.value[idx - 1]?.key || tabs.value[idx]?.key || null
  }
}
let dragKey: string | null = null

const onDragStart = (key: string) => {
  dragKey = key
}

const onDrop = (key: string) => {
  if (!dragKey || dragKey === key) return
    // 2. 找到被拖拽标签和释放目标标签的下标
  const from = tabs.value.findIndex(t => t.key === dragKey)
  const to = tabs.value.findIndex(t => t.key === key)
    // 3. 从原位置移除被拖拽项
  const [moved] = tabs.value.splice(from, 1)
    // 4. 插入到目标位置
  tabs.value.splice(to, 0, moved)
    // 5. 清除记录
  dragKey = null
}
//----------------------------reminder frontend logic-----------------------------------------------------------------
const {
  currentReminderForm,
  isReminderLocked,
  isReminderActive,
  disablePastDate,
  disabledHours,
  disabledMinutes,
  onModeChange,
  onEnabledChange
} = useReminderForm(
  reminderStore,
  activeReminderItem,
  saveReminder
)
//-----------------------------------------------------name and content---------------------------------------------------
//content
const selectedContent = computed({
  get() {
    const id = activeContentItem.value?.contentId
    return id ? contentStore.value[id] ?? '' : ''
  },
  set(val: string) {
    const id = activeContentItem.value?.contentId
    if (!id) return

    if (contentStore.value[id] === val) return

    contentStore.value[id] = val
    activeContentItem.value.updatedAt = Date.now()
    if (activeTab.value?.type === 'notes') scheduleSave(id)
  }
})
// name
const selectedName = computed({
  get() {
    return activeContentItem.value?.name ?? ''
  },
  set(val: string) {
    if (!activeContentItem.value) return
    if (activeContentItem.value.name === val) return  

    activeContentItem.value.name = val
    activeContentItem.value.updatedAt = Date.now()
    if (activeTab.value?.type === 'notes') scheduleSave(activeContentItem.value.id)
    if (activeTab.value?.type === 'reminders') scheduleSaveReminder(activeContentItem.value.id)
  }
})

//---------------------------------------item delete---------------------------------------------
const confirmDeleteId = ref<number | null>(null)

const onDeleteItem = (id: number) => {
  console.log('delete', id)
  confirmDeleteId.value = id
}

const onCancelDelete = () => {
  confirmDeleteId.value = null
}

const onConfirmDelete = async (id: number) => {
  if (currentCategoryName.value === 'notes') {
    await window.api.notesDelete(id)
    await loadNotes()
  } else {
    await window.api.reminderDelete(id)
    delete reminderStore.value[id]
    await loadReminders()
  }

  // close tab and clean 
  closeTab(`${currentCategoryName.value}-${id}`)
  confirmDeleteId.value = null
}
//---------------------------------------item pinned-----------------------------------------------------------
const onTogglePin = (item: NoteItem | ReminderItem) => {
  item.pinned = !item.pinned
  if (currentCategoryName.value === 'notes') {
    scheduleSave(item.id)
  } else if (currentCategoryName.value === 'reminders') {
    scheduleSaveReminder(item.id)
  }
}
//----------------------------------------item search-----------------------------------------------------------
function normalizeForSearch(str: string): string {
  return str.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
}
// \p{L} for language characters, \p{N} for numbers, u for unicode, g for global

function matchSearch(text: string, query: string): boolean {
  if (!query) return true
  const normalizedText = normalizeForSearch(text)
  const normalizedQuery = normalizeForSearch(query)
  if (!normalizedQuery) return true 
  return normalizedText.includes(normalizedQuery)
}
//------------------------------preview----------------------------------------------------------------------
const getPreview = (contentId?: number) => {
  if (!contentId) return ''
  return getTextPreview(contentStore.value[contentId] ?? '')
}
const getReminderPreview = (id: number) => {
  return getTextPreview(reminderStore.value[id]?.text ?? '')
}

//----------------------------------sort of items------------------------------------------------
const sortedNotes = computed(() => {
  return [...dataMap.value.notes].sort((a, b) => {
    //return 副数 a在前
    //return 正数 b在前
    //return 0不换位置

    // pin first
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap

    // sort by updated time 
    const au = a.updatedAt ?? 0
    const bu = b.updatedAt ?? 0
    return bu - au
  })
})
const sortedReminders = computed(() => {
  return [...dataMap.value.reminders].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    const au = a.updatedAt ?? 0
    const bu = b.updatedAt ?? 0
    return bu - au
  })
})
//---------------------------------settings-----------------------------------------------------
const onOpenSettings = async () => {
  await window.api.settingsOpen()
}
//-----------------------------watch-------------------------------------

watch(
  [
    () => activeTab.value?.type,
    () => activeContentItem.value?.id,
    () => currentReminderForm.value
  ],
  ([tabType, id, _form], [_prevTabType, prevId, _prevForm]) => {
    if (tabType !== 'reminders' || !id) return
    if (id !== prevId) return
    const item = dataMap.value.reminders.find(r => r.id === id)
    if (item) item.updatedAt = Date.now()
    scheduleSaveReminder(id)
  },
  { deep: true }
)
</script>







