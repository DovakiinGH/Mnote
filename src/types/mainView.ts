export type TabType = 'notes' | 'reminders'

export type UnitItem = {
  id: number
  name: string
  contentId: number
  createAt?: number | null
  updatedAt?: number | null
  pinned?: boolean
}

export type ReminderTypeKey = 'AFTER_MINUTES' | 'DATE_TIME' | 'EVERY_DAYS'
export type ReminderMode = 'NOTIFICATION' | 'POPUP_WINDOW'| 'POMODORO'

export type ReminderForm = {
  type: ReminderTypeKey
  mode: ReminderMode
  text: string
  enabled: boolean
  minutes?: number
  date?: string
  time?: string
  days?: number
}
