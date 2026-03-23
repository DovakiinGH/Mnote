import db from './db'

export type ReminderTypeKey = 'AFTER_MINUTES' | 'DATE_TIME' | 'EVERY_DAYS'
export type ReminderMode = 'NOTIFICATION' | 'POPUP_WINDOW'

export type ReminderRow = {
  id: number
  title: string
  text: string
  enabled: number
  mode: ReminderMode
  type: ReminderTypeKey
  minutes: number | null
  date: string | null
  time: string | null
  days: number | null
  createAt: number
  updatedAt: number
  pinned: number
  lastTriggeredAt: number | null
}

export type ReminderUpsertInput = {
  id: number
  title: string
  text: string
  enabled: number
  mode: ReminderMode
  type: ReminderTypeKey
  minutes?: number | null
  date?: string | null
  time?: string | null
  days?: number | null
  createAt?: number | null
  updatedAt?: number | null
  pinned?: number
  lastTriggeredAt?: number | null
}

export function getAllReminders(): ReminderRow[] {
  return db.prepare(`
    SELECT * FROM reminders ORDER BY updatedAt DESC
  `).all() as ReminderRow[]
}

export function upsertReminder(input: ReminderUpsertInput) {
  const now = Date.now()

  db.prepare(`
    INSERT INTO reminders
      (id, title, text, enabled, mode, type, minutes, date, time, days, pinned, createAt, updatedAt, lastTriggeredAt)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      text = excluded.text,
      enabled = excluded.enabled,
      mode = excluded.mode,
      type = excluded.type,
      minutes = excluded.minutes,
      date = excluded.date,
      time = excluded.time,
      days = excluded.days,
      pinned = excluded.pinned,
      updatedAt = excluded.updatedAt,
      lastTriggeredAt = COALESCE(excluded.lastTriggeredAt, lastTriggeredAt)
  `).run(
    input.id,
    input.title,
    input.text,
    input.enabled,
    input.mode,
    input.type,
    input.minutes ?? null,
    input.date ?? null,
    input.time ?? null,
    input.days ?? null,
    input.pinned ?? 0,
    input.createAt ?? now,
    input.updatedAt ?? now,
    input.lastTriggeredAt ?? null
  )
  return true
}

export function deleteReminder(id: number) {
  db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
  return true
}

export function getEnabledReminders(): ReminderRow[] {
  return db.prepare(`
    SELECT * FROM reminders WHERE enabled = 1
  `).all() as ReminderRow[]
}

export function markTriggered(id: number, ts: number) {
  db.prepare(
    'UPDATE reminders SET lastTriggeredAt = ?, updatedAt = ? WHERE id = ?'
  ).run(ts, ts, id)
}

export function disableReminder(id: number, ts: number) {
  db.prepare(
    'UPDATE reminders SET enabled = 0, updatedAt = ? WHERE id = ?'
  ).run(ts, id)
}