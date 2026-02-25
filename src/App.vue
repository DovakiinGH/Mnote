
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
        <el-menu-item index="file" class="top-btn">{{ t('app.menu.file') }}</el-menu-item>
        <el-menu-item index="edit" class="top-btn">{{ t('app.menu.edit') }}</el-menu-item>
        <el-menu-item index="view" class="top-btn">{{ t('app.menu.view') }}</el-menu-item>
      </el-menu>
    </el-header>

  <el-container class="body">

      <!-- side menu part-->
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
        text>
        <el-icon><Setting /></el-icon>
        </el-button>

      </el-radio-group>

      <el-menu
      v-show="!isCollapse"
        :default-active="activeIndex"
        class="el-menu-vertical"
        :collapse="isCollapse"
        @select="onSelectSideMenu"
        @open="handleOpenSideMenu"
        @close="handleCloseSideMenu"
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
    <!-- sub side menu part-->
    <el-aside
      :class="['sub-side', { 'sub-collapse': !isSubOpen }]"
      :width="isSubOpen ? '22vw' : '0px'"
    >      
        <div class="sub-header">

              <el-button class="new-btn" type="primary" @click="onNewItem" >
                <span class="new-icon">
                  <el-icon class="plus-icon"><Plus /></el-icon>
                </span>              
                <span class="new-text">New</span>
              </el-button>      

        </div>
                <!-- <div class="sub-title">{{currentCategoryName}}</div> -->


        <el-scrollbar class="sub-list">        
          <div
            v-for="item in currentItems"
            :key="item.id"
            class="sub-item"
            :class="{ active: item.id === selectedSubId,'is-confirm': item.id === confirmDeleteId}"
            @click="onSubItemClick(item.id)"
            >
            <div class="item-content">
              {{ item.name }}
            </div>
            <div  v-if="activeIndex === '1'" class="item-preview">
            {{ getPreview(item.contentId) }}
            </div>
            <el-button
              v-if="item.id !== confirmDeleteId"
              class="item-del-btn"
              text
              @click.stop="onDeleteItem(item.id)"
            >
            <el-icon class="item-del-icon"><Delete /></el-icon>
            </el-button>
            <div v-if="item.id === confirmDeleteId" class="item-confirm">
              <el-button class="btn-confirm" @click.stop="onConfirmDelete(item.id)">确认</el-button>
              <el-button class="btn-cancel" @click.stop="onCancelDelete">返回</el-button>
            </div>
          </div>
        </el-scrollbar>
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
        <el-input
          v-model="selectedName"
          class="title-input"
          placeholder="请输入标题"
          maxlength="50"
          show-word-limit
          spellcheck="false"
        />
        <!-- 只在 notes 时显示编辑区 -->
        <el-scrollbar v-if="activeTab?.type === 'notes'" class="editor-scroll">
          <el-input
            v-model="selectedContent"
            type="textarea"
            class="note-editor"
            :autosize="{ minRows: 10 }"
            spellcheck="false"
            placeholder="开始写点什么..."
          />
        </el-scrollbar>

      <!-- reminders  -->
      <div v-else>
        <div class="reminder-panel">
          <div class="reminder-status">
         
            <el-radio-group v-model="currentReminderForm.enabled">
              <el-radio-button :label="true">启动</el-radio-button>
              <el-radio-button :label="false">关闭</el-radio-button>
            </el-radio-group>
          </div>
          <el-select v-model="currentReminderForm.type" placeholder="选择时间类型">
            <el-option v-for="t in REMINDER_TYPES" :key="t.key" :label="t.label" :value="t.key" />
          </el-select>

          <template v-if="currentReminderForm.type === 'AFTER_MINUTES'">
            <el-input-number v-model="currentReminderForm.minutes" :min="1" />
          </template>
          

          <template v-else-if="currentReminderForm.type === 'DATE_TIME'">
            <el-date-picker v-model="currentReminderForm.date" type="date" placeholder="选择日期" />
            <el-time-picker v-model="currentReminderForm.time" placeholder="可选时间" />
          </template>

          <template v-else-if="currentReminderForm.type === 'EVERY_DAYS'">
            <el-input-number v-model="currentReminderForm.days" :min="1" />
          </template>

          <el-scrollbar class="reminder-text-scroll">
            <el-input
              v-model="currentReminderForm.text"
              type="textarea"
              :autosize="{ minRows: 2 }"
              maxlength="500"
              show-word-limit
              class="reminder-textarea"
              placeholder="请输入提醒内容（最多 500 字）"
            />
          </el-scrollbar>
        </div>
      </div>
    </div>

    <div v-else class="empty-placeholder">add some thing</div>
    </el-main>

  </el-container>
    <!-- body end -->
  </el-container>
  <!-- app end  -->
</template>




<script lang="ts" setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
const { t, locale } = useI18n()
const activeIndex = ref('1')
const isCollapse = ref(true)
const isSubOpen = ref(true)
const selectedSubId = ref<number | null>(null)
//reminder
type ReminderTypeKey = 'AFTER_MINUTES' | 'DATE_TIME' | 'EVERY_DAYS'

const REMINDER_TYPES = [
  { key: 'AFTER_MINUTES', label: '几分钟后' },
  { key: 'DATE_TIME', label: '年月日（可选时间）' },
  { key: 'EVERY_DAYS', label: '几天一次' }
] as const

type ReminderForm = {
  type: ReminderTypeKey
  text: string
  enabled: boolean
  minutes?: number
  date?: string
  time?: string
  days?: number
}

// const reminderForm = ref<ReminderForm>({
//   type: 'AFTER_MINUTES',
//   text: '',
//   minutes: 5
// })

const reminderStore = ref<Record<number, ReminderForm>>({})
const currentReminderForm = computed<ReminderForm>(() => {
  const id = activeContentItem.value?.id
  if (!id) {
    return { type: 'AFTER_MINUTES', text: '', minutes: 5, enabled: true }
  }
  if (!reminderStore.value[id]) {
  reminderStore.value[id] = {
    type: 'AFTER_MINUTES',
    text: '',
    minutes: 5,
    enabled: true
  }
}
  return reminderStore.value[id]
})
//reminder end

const handleOpenSideMenu = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}
const handleCloseSideMenu = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
}

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
const dataMap = ref({
  notes:[{id:1,name:'sasasasa', contentId: 101},{id:2,name:'cdcdcdcdc', contentId: 102},{id:3,name:'cnmdsd'},{id:4,name:'odsndnmsdfm'},{id:5,name:'odsndnmsdfm'},{id:6,name:'dsdssd'}],
  reminders:[{id:10,name:'b',contentId: 201},{id:20,name:'c'}]
})
const contentStore = ref<Record<number, string>>({
  101: '这是第一条笔记内容',
  102: '这是第二条笔记内容',
  201: '提醒事项内容'
})

const currentCategoryName = computed<'notes'|'reminders'>(() => {
  return activeIndex.value === '1' ? 'notes' : 'reminders'
})  
const currentItems  = computed(()=>dataMap.value[currentCategoryName.value])
//Tabs
type TabType = 'notes' | 'reminders'

type Tab = {
  key: string
  type: TabType
  itemId: number
  // title: string
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
    // 1. 合法性检查
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



const selectedSubItem = computed(() => {
  return currentItems.value.find(i => i.id === selectedSubId.value)|| null}) 
  //数组.find(查找条件) 
// 这是一个箭头函数，相当于：
// function(i) {
//   return i.id === selectedSubId.value
// }
// const selectedContent = computed({
//   get() {
//     const id = selectedSubItem.value?.contentId // 使用 ?. 自动处理可能为 undefined 的情况
//     return id ? contentStore.value[id] ?? '' : ''
//     // 语法：条件 ? 值1 : 值2
//     // 如果条件为真，返回 值1，否则返回 值2

//     // ?? 含义：如果左侧是 null 或 undefined，就返回右侧的值
//   },
//   set(val: string) {
//     const id = selectedSubItem.value?.contentId
//     if (id) contentStore.value[id] = val
//   }
// })

//文本
const selectedContent = computed({
  get() {
    const id = activeContentItem.value?.contentId
    return id ? contentStore.value[id] ?? '' : ''
  },
  set(val: string) {
    const id = activeContentItem.value?.contentId
    if (id) contentStore.value[id] = val
  }
})

// const selectedName = computed({
//   get() {
//     return selectedSubItem.value?.name ?? ''
//   },
//   set(val: string) {
//     if (selectedSubItem.value) {
//       selectedSubItem.value.name = val
//     }
//   }
// })
const selectedName = computed({
  get() {
    return activeContentItem.value?.name ?? ''
  },
  set(val: string) {
    if (activeContentItem.value) activeContentItem.value.name = val
  }
})

const confirmDeleteId = ref<number | null>(null)

const onDeleteItem = (id: number) => {
  console.log('delete', id)
  confirmDeleteId.value = id
}

const onCancelDelete = () => {
  confirmDeleteId.value = null
}
const onConfirmDelete = (id: number) => {
  // 1) 找到当前分类的列表（notes 或 reminders）
  const list = dataMap.value[currentCategoryName.value]

  // 2) 在这个列表中找到要删除的 item 的下标
  const idx = list.findIndex(i => i.id === id)

  // 3) 如果找到了（idx !== -1）
  if (idx !== -1) {
    // 4) 先取出它对应的 contentId
    const contentId = list[idx].contentId
    // 5) 从列表里删除这个 item
    list.splice(idx, 1)
    // 6) 从 contentStore 里删除对应的内容
  if (contentId !== undefined) {
    delete contentStore.value[contentId]
    }   }

    // 7) 关闭对应tab
    const key = `${currentCategoryName.value}-${id}`
    closeTab(key)

  // 8) 退出“确认删除”状态
  confirmDeleteId.value = null
}
const getPreview = (contentId?: number) => {
  if (!contentId) return ''
  const text = contentStore.value[contentId] ?? ''
  return text.replace(/\s+/g, ' ').trim().slice(0, 40)
}

const onNewItem = () => {
  const list = dataMap.value[currentCategoryName.value]

  // 生成新 id（简单起见用时间戳）
  const newId = Date.now()
  const newContentId = Date.now() + 1

  // 新 item
  const newItem = {
    id: newId,
    name: 'new',
    contentId: newContentId
  }

  // 添加到当前列表
  list.unshift(newItem)

  // 初始化内容
  contentStore.value[newContentId] = ''

  // 自动选中新建项
  selectedSubId.value = newId
}

const getTabTitle = (tab: Tab) => {
  const list = dataMap.value[tab.type]
  return list.find(i => i.id === tab.itemId)?.name ?? 'Untitled'
}



/**
 * Element Plus 组件本身也有语言包
 * 例如分页、对话框按钮的中文/英文
 */
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

/**
 * 切换语言：本质就是改 locale
 * vue-i18n 会自动刷新页面中的文字
 */
const switchLang = (lang: 'zh-CN' | 'en-US') => {
  locale.value = lang
  localStorage.setItem('lang', lang) // 保存到本地，刷新后仍生效
}

/**
 * 让 Element Plus 的组件语言跟随切换
 * computed 会根据 locale 自动重新计算
 */
const epLocale = computed(() => {
  return locale.value === 'zh-CN' ? zhCn : en
})

const onTabWheel = (e: WheelEvent) => {
  const wrap = (e.currentTarget as HTMLElement)
    .querySelector('.el-scrollbar__wrap') as HTMLElement | null
  if (!wrap) return
  wrap.scrollLeft += e.deltaY
}
</script>







