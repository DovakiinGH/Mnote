import { pool } from './db'
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

export async function getAllReminders() {
  const [rows] = await pool.query(`
    SELECT *
    FROM reminders
    ORDER BY updatedAt DESC
  `)
  return rows as ReminderRow[]
}

export async function upsertReminder(input: ReminderUpsertInput) {
  const now = Date.now()

  await pool.execute(
    `
    INSERT INTO reminders
      (id, title, text, enabled, mode, type, minutes, date, time, days, pinned, createAt, updatedAt, lastTriggeredAt)
    VALUES
      (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      text = VALUES(text),
      enabled = VALUES(enabled),
      mode = VALUES(mode),
      type = VALUES(type),
      minutes = VALUES(minutes),
      date = VALUES(date),
      time = VALUES(time),
      days = VALUES(days),
      pinned = VALUES(pinned),
      updatedAt = VALUES(updatedAt),
      lastTriggeredAt = COALESCE(VALUES(lastTriggeredAt), lastTriggeredAt)
    `,
    [
    //for ? in VALUES
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
    ]
  )
  return true
}
export async function deleteReminder(id: number) {
  await pool.execute(`DELETE FROM reminders WHERE id = ?`, [id])
  return true
}
export async function markReminderTriggered(id: number, ts = Date.now()): Promise<void> {
  await pool.execute(`UPDATE reminders SET lastTriggeredAt = ? WHERE id = ?`, [ts, id])
}