import db from './db'

export function initSchema() {
  // notes 
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      updatedAt INTEGER,
      createAt INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0
    )
  `)

  // reminders 
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'NOTIFICATION',
      type TEXT NOT NULL DEFAULT 'AFTER_MINUTES',

      minutes INTEGER,          -- AFTER_MINUTES 使用
      date TEXT,                -- DATE_TIME 使用（存 "YYYY-MM-DD"）
      time TEXT,                -- DATE_TIME / EVERY_DAYS 可选（存 "HH:mm:ss"）
      days INTEGER,             -- EVERY_DAYS 使用

      pinned INTEGER NOT NULL DEFAULT 0,
      createAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastTriggeredAt INTEGER
    )
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_updatedAt ON reminders(updatedAt)`)

  console.log('[schema] SQLite tables ready')
}