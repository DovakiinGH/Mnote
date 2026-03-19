import type { ReminderRow } from "../backend/reminders.repo";

const DAY_MS = 24 * 60 * 60 * 1000

function dateToYmd(v: string | Date | null): string | null {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)

  const y = v.getFullYear()
  const m = String(v.getMonth() + 1).padStart(2, '0')
  const d = String(v.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeTime(v: string | null): string {
  if (!v) return '00:00:00'
  // TIME 可能是 HH:mm:ss 或 HH:mm
  if (v.length === 5) return `${v}:00`
  return v
}

function toDateTimeTs(dateVal: string | Date | null, timeVal: string | null): number | null {
  const ymd = dateToYmd(dateVal)
  if (!ymd) return null
  const hms = normalizeTime(timeVal)
  const ts = new Date(`${ymd}T${hms}`).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function getDueAt(row: ReminderRow): number | null {
  if (row.type === 'AFTER_MINUTES') {
    const m = row.minutes ?? 1
    return (row.updatedAt ?? row.createAt) + m * 60 * 1000
  }

  if (row.type === 'DATE_TIME') {
    return toDateTimeTs(row.date, row.time)
  }

  // EVERY_DAYS
  const d = row.days ?? 1
  const base = row.lastTriggeredAt ?? row.updatedAt ?? row.createAt
  return base + d * DAY_MS
}

export function isDue(row: ReminderRow, now: number): boolean {
  const dueAt = getDueAt(row)
  if (!dueAt) return false
  if (now < dueAt) return false

  // 防重复触发
  if (row.lastTriggeredAt && row.lastTriggeredAt >= dueAt) return false
  return true
}