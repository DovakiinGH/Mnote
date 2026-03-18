import { pool } from '../backend/db' // 按你实际路径改

export type SchedulerReminderRow = {
  id: number
  title: string
  text: string
  enabled: number
  mode: 'NOTIFICATION' | 'POPUP_WINDOW'
  type: 'AFTER_MINUTES' | 'DATE_TIME' | 'EVERY_DAYS'
  minutes: number | null
  date: string | null
  time: string | null
  days: number | null
  createAt: number
  updatedAt: number
  lastTriggeredAt: number | null
}

export async function getEnabledReminders(): Promise<SchedulerReminderRow[]> {
  const [rows] = await pool.query(`
    SELECT
      id, title, text, enabled, mode, type, minutes, \`date\`, \`time\`, days,
      createAt, updatedAt, lastTriggeredAt
    FROM reminders
    WHERE enabled = 1
  `)
  return rows as SchedulerReminderRow[]
}

export async function markTriggered(id: number, ts: number) {
  await pool.execute(
    `UPDATE reminders SET lastTriggeredAt = ?, updatedAt = ? WHERE id = ?`,
    [ts, ts, id]
  )
}

export async function disableReminder(id: number, ts: number) {
  await pool.execute(
    `UPDATE reminders SET enabled = 0, updatedAt = ? WHERE id = ?`,
    [ts, id]
  )
}