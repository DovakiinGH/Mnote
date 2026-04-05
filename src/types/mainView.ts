// src/types/mainView.ts

export type BaseItem = {
  id: number
  name: string
  contentId: number
  createAt?: number | null
  updatedAt?: number | null
  pinned?: boolean
}

export type NoteItem = BaseItem

export type ReminderItem = BaseItem & {
  lastTriggeredAt: number | null
}

export type TabType = 'notes' | 'reminders'

export type ReminderForm = {
  type: 'AFTER_MINUTES' | 'DATE_TIME' | 'EVERY_DAYS'
  mode: 'NOTIFICATION' | 'POPUP_WINDOW' | 'POMODORO'
  text: string
  enabled: boolean
  minutes?: number
  date?: string
  time?: string
  days?: number
}