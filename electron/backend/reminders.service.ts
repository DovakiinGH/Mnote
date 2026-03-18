import {
  getAllReminders,
  upsertReminder,
  deleteReminder,
  markReminderTriggered,
  type ReminderUpsertInput
} from './reminders.repo'

export function normalizeReminderByType(f: ReminderUpsertInput) {
  if (f.type === 'AFTER_MINUTES') {
    return { minutes: f.minutes ?? 1, date: null, time: null, days: null }
  }
  if (f.type === 'DATE_TIME') {
    return { minutes: null, date: f.date ?? null, time: f.time ?? null, days: null }
  }
  return { minutes: null, date: null, time: f.time ?? null, days: f.days ?? 1 }
}
export async function listRemindersService() {
  return getAllReminders()
}
export async function saveReminderService(input: ReminderUpsertInput) {
  const now = Date.now()
  const normalized = normalizeReminderByType(input)

  await upsertReminder({
    ...input,
    ...normalized,
    title: (input.title ?? '').trim() || 'Untitled',
    text: input.text ?? '',
    enabled: input.enabled ? 1 : 0,
    pinned: input.pinned ?? 0,
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now
    // lastTriggeredAt 不传时由 repo 的 COALESCE 保留旧值
  })

  return true
}
export async function removeReminderService(id: number) {
  await deleteReminder(id)
  return true
}

export async function markReminderTriggeredService(id: number, ts = Date.now()) {
  await markReminderTriggered(id, ts)
  return true
}

export async function createReminderService() {
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

  await saveReminderService(reminder)
  return reminder
}