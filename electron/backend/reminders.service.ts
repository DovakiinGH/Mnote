import {
  getAllReminders,
  upsertReminder,
  deleteReminder,
  markTriggered,
  type ReminderUpsertInput
} from './reminders.repo'

export function normalizeReminderByType(f: ReminderUpsertInput) {
  if (f.mode === 'POMODORO') {
    return {
      type: 'AFTER_MINUTES' as const,
      minutes: Math.min(Math.max(f.minutes ?? 25, 1), 1440),
      date: null,
      time: null,
      days: null
    }
  }
  if (f.type === 'AFTER_MINUTES') {
    return {
      type: f.type,
      minutes: Math.min(Math.max(f.minutes ?? 1, 1), 1440),
      date: null,
      time: null,
      days: null
    }
  }
  if (f.type === 'DATE_TIME') {
    return { type: f.type, minutes: null, date: f.date ?? null, time: f.time ?? null, days: null }
  }
  return {
    type: f.type,
    minutes: null,
    date: null,
    time: f.time ?? null,
    days: Math.min(Math.max(f.days ?? 1, 1), 365)
  }
}

export function listRemindersService() {
  return getAllReminders()
}

export function saveReminderService(input: ReminderUpsertInput) {
  const now = Date.now()
  const normalized = normalizeReminderByType(input)

  upsertReminder({
    ...input,
    ...normalized,
    title: (input.title ?? '').trim() || 'Untitled',
    text: input.text ?? '',
    enabled: input.enabled ? 1 : 0,
    pinned: input.pinned ?? 0,
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now
  })

  return true
}

export function removeReminderService(id: number) {
  deleteReminder(id)
  return true
}

export function markReminderTriggeredService(id: number, ts = Date.now()) {
  markTriggered(id, ts)
  return true
}

export function createReminderService() {
  const now = Date.now()
  const id = now

  const reminder = {
    id,
    title: 'new',
    text: '',
    enabled: 0,
    mode: 'NOTIFICATION' as const,
    type: 'AFTER_MINUTES' as const,
    minutes: 5,
    date: null,
    time: null,
    days: null,
    createAt: now,
    updatedAt: now,
    pinned: 0,
    lastTriggeredAt: null
  }

  saveReminderService(reminder)
  return reminder
}