import type { ReminderForm } from '../types/mainView'

export const REMINDER_TYPES = [
  { key: 'AFTER_MINUTES', label: 'minutes later' },
  { key: 'DATE_TIME', label: 'yy/mm/dd' },
  { key: 'EVERY_DAYS', label: 'evey few days' }
] as const

export function normalizeReminderByType(f: ReminderForm) {
  if (f.type === 'AFTER_MINUTES') {
    return { minutes: f.minutes ?? 1, date: null, time: null, days: null }
  }
  if (f.type === 'DATE_TIME') {
    return { minutes: null, date: f.date ?? null, time: f.time ?? null, days: null }
  }
  return { minutes: null, date: null, time: f.time ?? null, days: f.days ?? 1 }
}