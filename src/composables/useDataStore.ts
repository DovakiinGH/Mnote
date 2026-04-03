import { ref } from 'vue'
import type { NoteItem, ReminderItem, ReminderForm } from '../types/mainView'
export function useDataStore() {
const dataMap = ref<{
  notes: NoteItem[]
  reminders: ReminderItem[]
}>({
  notes: [{ id: 1, name: 'no', contentId: 101 }],
  reminders: [{ id: 10, name: 'no', contentId: 101, lastTriggeredAt: null }]
}) //格式：ref<T>(initialValue)
const contentStore = ref<Record<number, string>>({
  101: '',
})
const reminderStore = ref<Record<number, ReminderForm>>({})

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
  try {
    const rows = await window.api.reminderGetAll()
    dataMap.value.reminders = rows.map((r: any) => ({
    id: Number(r.id),
    name: r.title ?? 'untitled',
    contentId: Number(r.id), 
    createAt: Number(r.createAt ?? Date.now()),
    updatedAt: r.updatedAt != null ? Number(r.updatedAt) : null,
    pinned: Boolean(r.pinned),
    lastTriggeredAt: r.lastTriggeredAt != null ? Number(r.lastTriggeredAt) : null
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
//--------------------------end save-------------------------------------------------------------------------------------
const closePomodoroBeforeClose = async () => {
  for (const [idStr, form] of Object.entries(reminderStore.value)) {
    if (form.mode === 'POMODORO' && form.enabled) {
      await window.api.pomodoroStop()
      form.enabled = false
      await saveReminder(Number(idStr))
    }
  }
}
 const registerSaveBeforeClose = () => {
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
  }

  // ---------- 注册外部事件监听（数据变化） ----------
  const registerDataChangeListeners = () => {
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
  }
 return {
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
  }
//save note donot return because it do not been used in MainView
}