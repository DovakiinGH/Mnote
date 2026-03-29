
<template>
  <el-container class="app">
    <!-- top part-->
    <el-header class="top-bar">
      <div class="app-title">{{ t('app.title') }}</div>
      <el-menu
        mode="horizontal"
        class="top-menu"
        background-color="transparent"
        text-color="#fff"
        active-text-color="#fff"
      >
        <el-menu-item @click="testClick" v-if = topButton index="file" class="top-btn">{{ t('app.menu.file') }}</el-menu-item>
        <el-menu-item @click="testClickSecond" v-if = topButton index="edit" class="top-btn">{{ t('app.menu.edit') }}</el-menu-item>
        <el-menu-item v-if = topButton index="view" class="top-btn">{{ t('app.menu.view') }}</el-menu-item>
      </el-menu>
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
        :default-active="activeIndex"
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
            v-for="item in currentItems"
            :key="item.id"
            class="sub-item"
            :class="{ 
              active: item.id === selectedSubId,
              'is-confirm': item.id === confirmDeleteId,
              'is-running': isReminderActive(item.id)
              }"
            @click="onSubItemClick(item.id)"
            >
            <!-- sub list items --------------------------->
             <!--text -->
            <div class="item-content">
              {{ item.name }}
            </div>
            <div  v-if="activeIndex === '1'" class="item-preview">
            {{ getPreview(item.contentId) }}
            </div>
            <div v-if="activeIndex === '2'" class="item-preview">
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
            placeholder="Input the tile"
            maxlength="50"
            show-word-limit
            spellcheck="false"
          />
        </div>
        <div class="note-time">
        <div class="time-line">
            {{ activeContentItem?.createAt ? formatTime(activeContentItem.createAt) : '' }}
          </div>
          <div class="time-line">
            {{ activeContentItem?.updatedAt ? formatTime(activeContentItem.updatedAt) : '' }}
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
          placeholder="Select date"
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
          placeholder="Select time(optional)"
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
import type { UnitItem, TabType, ReminderForm  } from '../types/mainView'
import {REMINDER_TYPES} from '../services/reminderUtils'
import { formatTime } from '../services/timeUtils'
import { useWheelScroll } from '../composables/useWheelScroll'

const { onTabWheel, onTitleWheel } = useWheelScroll()


const { t, locale } = useI18n()
const activeIndex = ref('1')
const isCollapse = ref(true)
const isSubOpen = ref(true)
const selectedSubId = ref<number | null>(null)

const topButton = false
const currentCloseAction=ref('tray')

const testClick=async ()=>{
  await window.api.showReminder({
  title: 'MNote Reminder',
  body: 'Buy milk at 18:00'
})
}
const testClickSecond=async ()=>{
  await window.api.openMandatoryReminder('Pay rent today')
}


//---------------------------------------------------data load and save------------------------------------------------------//
const loadNotes = async () => {
  const rows = await window.api.notesGetAll()

  dataMap.value.notes = rows.map(r => ({
    id: r.id,
    name: r.title,
    contentId: r.id,
    createAt: r.createAt,  
    updatedAt: r.updatedAt,    
    pinned: Boolean(r.pinned) 
  }))

  rows.forEach(r => {
    contentStore.value[r.id] = r.content ?? ''
  })
}
const loadReminders = async()=>{
  try {const rows = await window.api.reminderGetAll()

    dataMap.value.reminders = rows.map((r: any) => ({
    id: Number(r.id),
    name: r.title ?? 'untitled',
    contentId: Number(r.id), 
    createAt: Number(r.createAt ?? Date.now()),
    updatedAt: r.updatedAt != null ? Number(r.updatedAt) : null,
    pinned: Boolean(r.pinned)
  }))
    rows.forEach((r: any) => {
    const id = Number(r.id)
    reminderStore.value[id] = {
      type: r.type,
      mode: r.mode,
      text: r.text ?? '',
      enabled: Boolean(r.enabled),
      minutes: r.minutes ?? undefined,
      date: r.date ?? undefined,
      time: r.time ?? undefined,
      days: r.days ?? undefined,
    }
  })}catch (e) {
    console.error('[loadReminders] failed', e)
  }

}
const saveNote = async (id: number) => {
  const note = dataMap.value.notes.find(n => n.id === id)
  if (!note) return

  await window.api.notesUpsert({
    id,
    title: note.name,
    content: contentStore.value[note.contentId] ?? '',
    updatedAt: note.updatedAt ?? Date.now(),
    createAt: note.createAt?? null,
    pinned: note.pinned ? 1 : 0
  })
}

const saveReminder = async (id: number) => {
  const item = dataMap.value.reminders.find(r => r.id === id)
  if (!item) return
  const f = reminderStore.value[id]
  if (!f) return

  await window.api.reminderUpsert({
    id,
    title: item.name ?? '',
    text: f.text ?? '',
    enabled: f.enabled ? 1 : 0,
    mode: f.mode,
    type: f.type,
    minutes: f.minutes ?? null,
    date: f.date ?? null,
    time: f.time ?? null,
    days: f.days ?? null,
    createAt: item.createAt ?? Date.now(),
    updatedAt: item.updatedAt ?? Date.now(),
    pinned: item.pinned ? 1 : 0
  })
}

const saveAllNotes = async () => {
  const list = dataMap.value.notes
  for (const n of list) {
    await window.api.notesUpsert({
      id: n.id,
      title: n.name,
      content: contentStore.value[n.contentId] ?? '',
      updatedAt: n.updatedAt ?? null,
      createAt: n.createAt ?? null,
      pinned: n.pinned ? 1 : 0
    })
  }
}
const saveAllReminders = async () => {
  for (const r of dataMap.value.reminders) {
    await saveReminder(r.id)
  }
}
const closePomodoroBeforeClose = async () => {
  for (const [idStr, form] of Object.entries(reminderStore.value)) {
    if (form.mode === 'POMODORO' && form.enabled) {
      await window.api.pomodoroStop()
      form.enabled = false
      await saveReminder(Number(idStr))
    }
  }
}
window.api.onSaveBeforeClose(async () => {
  try {
    if (saveTimer) {
      window.clearTimeout(saveTimer)
      saveTimer = null
    }
    if (reminderSaveTimer) {
      window.clearTimeout(reminderSaveTimer)
      reminderSaveTimer = null
    }
    
    await saveAllNotes()
    await saveAllReminders()
    await closePomodoroBeforeClose()
  } catch (e) {
    console.error('[onSaveBeforeClose] failed:', e)
  } finally {
    window.api.notifySaveDone() 
  }
})

onMounted(async () => {
  loadNotes()
  loadReminders()
  window.api.onNotesChanged(() => {
    loadNotes()
  })
  window.api.onRemindersChanged(() => {
    loadReminders()
  })
  window.api.onPomodoroClosed((id: number) => {
    const form = reminderStore.value[id]
    if (form) {
      form.enabled = false
      scheduleSaveReminder(id)
    }
     })
  const settings = await window.api.settingsGet()  
  locale.value = settings.language                  
  currentCloseAction.value = settings.closeAction
  window.api.onSettingsChanged((settings) => {
      locale.value = settings.language
      currentCloseAction.value = settings.closeAction
    })
    
  
})


//--------------------------schedule save-------------------------------------------------------------------------------------

let saveTimer: number | null = null

const scheduleSave = (id: number) => {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveNote(id)
  }, 500)
}
let reminderSaveTimer: number | null = null

const scheduleSaveReminder = (id: number) => {
  if (reminderSaveTimer) window.clearTimeout(reminderSaveTimer)
  reminderSaveTimer = window.setTimeout(() => {
    saveReminder(id)
  }, 500)
}


//--------------------------const-------------------------------------------------------------------------------------
const dataMap = ref<{
  notes: UnitItem[]
  reminders: UnitItem[]
}>({
  notes: [{ id: 1, name: 'no', contentId: 101 }],
  reminders: [{ id: 10, name: 'no', contentId: 101 }]
}) //格式：ref<T>(initialValue)
const contentStore = ref<Record<number, string>>({
  101: '',
})

//----------------------------reminder const-----------------------------------------------------------------
const reminderStore = ref<Record<number, ReminderForm>>({})

const isReminderLocked = computed(() => {
  return currentReminderForm.value.enabled === true
})
const currentReminderForm = computed<ReminderForm>(() => {
  const id = activeContentItem.value?.id
  if (!id) {
    return { type: 'AFTER_MINUTES',mode: 'NOTIFICATION', text: '', minutes: 5, enabled: false }
  } 
  if (!reminderStore.value[id]) {
  reminderStore.value[id] = {
    type: 'AFTER_MINUTES',
    mode: 'NOTIFICATION',
    text: '',
    minutes: 5,
    enabled: false
  }
}
  return reminderStore.value[id]
})
//use to make reminder sub list item change color
const isReminderActive = (id: number): boolean => {
  if (currentCategoryName.value !== 'reminders') return false
  return reminderStore.value[id]?.enabled === true
}
const disablePastDate = (time: Date) => {
  return time.getTime() < Date.now() - 8.64e7
}
const isToday = computed(() => {
  if (!currentReminderForm.value.date) return false
  const today = new Date().toISOString().slice(0, 10)  
  return currentReminderForm.value.date === today
})

const disabledHours = () => {
  if (!isToday.value) return []
  const currentHour = new Date().getHours()
  return Array.from({ length: currentHour }, (_, i) => i)
}

const disabledMinutes = (hour: number) => {
  if (!isToday.value) return []
  const now = new Date()
  if (hour > now.getHours()) return []  
  if (hour < now.getHours()) return Array.from({ length: 60 }, (_, i) => i)  
  return Array.from({ length: now.getMinutes() }, (_, i) => i)
}
// functions related to reminder form
const onModeChange = (mode: string) => {
  if (mode === 'POMODORO') {
    currentReminderForm.value.type = 'AFTER_MINUTES'
    if (!currentReminderForm.value.minutes || currentReminderForm.value.minutes < 1) {
      currentReminderForm.value.minutes = 25
    }
  }
}
const onEnabledChange = async (val: boolean) => {
  const item = activeContentItem.value
  if (!item) return
  const form = reminderStore.value[item.id]
  if (!form || form.mode !== 'POMODORO') return

  if (val) {
    // close other pomodoro windows
    for (const [idStr, f] of Object.entries(reminderStore.value)) {
      //id and f are string and ReminderForm;  Object means the pair of id and form in reminderStore
      const otherId = Number(idStr)
      if (otherId !== item.id && f.mode === 'POMODORO' && f.enabled) {
        f.enabled = false
        scheduleSaveReminder(otherId)
      }
    }

    // start pomodoro window
    await window.api.pomodoroStart({
      id: item.id,
      title: item.name,
      text: form.text ?? '',
      minutes: form.minutes ?? 25
    })
  } else {
    // close pomodoro window
    await window.api.pomodoroStop()
  }
}
//--------------------------------add new item------------------------------------------------------------

const onNewItem = async () => {
  if (currentCategoryName.value === 'notes') {
    const n = await window.api.notesCreate()
    await loadNotes()
    selectedSubId.value = Number(n.id)
    onSubItemClick(Number(n.id))
    return
  }
  const r = await window.api.reminderCreate()
  await loadReminders()
  selectedSubId.value = Number(r.id)
  onSubItemClick(Number(r.id))
}

const getTabTitle = (tab: Tab) => {
  const list = dataMap.value[tab.type]
  return list.find(i => i.id === tab.itemId)?.name ?? 'Untitled'
}


//--------------------------------handleing side menus-----------------------------------------------------------------

const onSelectSideMenu = (index: string) => {
  activeIndex.value = index
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

const onSubSideEndClick=() => {
  isCollapse.value=true
  isSubOpen.value = false
}


const currentCategoryName = computed<'notes'|'reminders'>(() => {
  return activeIndex.value === '1' ? 'notes' : 'reminders'
})  

const currentItems = computed(() => {
  if (currentCategoryName.value === 'notes') return sortedNotes.value
  if (currentCategoryName.value === 'reminders')return sortedReminders.value
  return []
})

//-----------------------------------Tabs----------------------------------------------------------
type Tab = {
  key: string
  type: TabType
  itemId: number
}

const tabs = ref<Tab[]>([])
const activeTabKey = ref<string | null>(null)

const makeTabKey = (type: TabType, id: number) => `${type}-${id}`
//造边栏id
const onSubItemClick = (id: number) => {
  selectedSubId.value = id
  //用type+id 创建 tab的key
  const type: TabType = currentCategoryName.value
  const key = makeTabKey(type, id)

  // 确保 tab 存在 若不存在则使其存在
  if (!tabs.value.find(t => t.key === key)) {
    tabs.value.push({ key, type, itemId: id })
  }

  // 通过更改activeTabKey 激活该 tab
  activeTabKey.value = key
} //点击边栏 激活tab

const activeTab = computed(() => {
  return tabs.value.find(t => t.key === activeTabKey.value) || null
}) //返回活跃的tab

const activateTab = (key: string) => {
  //点击tab 切换边栏
  activeTabKey.value = key

  const tab = tabs.value.find(t => t.key === key)
  if (!tab) return

  activeIndex.value = tab.type === 'notes' ? '1' : '2'
  selectedSubId.value = tab.itemId
} //更新边栏

const activeContentItem = computed(() => {
  if (!activeTab.value) return null
  const list = dataMap.value[activeTab.value.type]
  return list.find(i => i.id === activeTab.value!.itemId) || null
}) //返回活跃的边栏item

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

    // 内容没变，不更新时间，不触发保存
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
const onTogglePin = (item: UnitItem) => {
  item.pinned = !item.pinned
    if (currentCategoryName.value === 'notes') {
    scheduleSave(item.id)
  }else if (currentCategoryName.value === 'reminders') {
    scheduleSaveReminder(item.id)
  }
}
//------------------------------preview----------------------------------------------------------------------
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/\*{3}(.+?)\*{3}/g, '$1')
    .replace(/_{3}(.+?)_{3}/g, '$1')
    .replace(/\*{2}(.+?)\*{2}/g, '$1')
    .replace(/_{2}(.+?)_{2}/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^[\s]*-\s*\[[ x]\]\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^\|?[\s-:|]+\|[\s-:|]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const getPreview = (contentId?: number) => {
  if (!contentId) return ''
  const text = contentStore.value[contentId] ?? ''
  return stripMarkdown(text).slice(0, 40)
}

const getReminderPreview = (id: number) => {
  const text = reminderStore.value[id]?.text ?? ''
  return stripMarkdown(text).slice(0, 40)
}

//----------------------------------sort of items------------------------------------------------
const sortedNotes = computed(() => {
  return [...dataMap.value.notes].sort((a, b) => {
    //return 副数 a在前
    //return 正数 b在前
    //return 0不换位置

    // 1) 置顶优先
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap

    // 2) 更新时间倒序
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







