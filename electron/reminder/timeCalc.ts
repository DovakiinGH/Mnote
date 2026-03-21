import type { ReminderRow } from "../backend/reminders.repo";

const DAY_MS = 24 * 60 * 60 * 1000

//date to "YYYY-MM-DD"
function dateToYmd(v: string | Date | null): string | null {
  if (!v) return null
  //for string
  if (typeof v === 'string') return v.slice(0, 10)

  //for date object
  const y = v.getFullYear()
  const m = String(v.getMonth() + 1).padStart(2, '0')
  const d = String(v.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeTime(v: string | null): string {
  if (!v) return '00:00:00'
  // TIME can be HH:mm:ss or HH:mm
  if (v.length === 5) return `${v}:00`
  return v
}

//date+time to time stamp
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

  const nextDate = new Date(base)
  nextDate.setDate(nextDate.getDate() + d)

  const ymd = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`
  //"3".padStart(2, '0')    // → "03"（长度不足2，前面补0）
  //"12".padStart(2, '0')   // → "12"（已经是2位，不补）     ISO 格式
  const hms = normalizeTime(row.time)  

  const ts = new Date(`${ymd}T${hms}`).getTime()
  return Number.isNaN(ts) ? null : ts
}

export function isDue(row: ReminderRow, now: number): boolean {
  const dueAt = getDueAt(row)
  if (!dueAt) return false
  if (now < dueAt) return false

  if (row.lastTriggeredAt && row.lastTriggeredAt >= dueAt) return false
  return true
}