import mysql from 'mysql2/promise'
import { pool } from './db'

export async function initSchema() {
  const bootstrapConn = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? ''
  })

  await bootstrapConn.execute(`
    CREATE DATABASE IF NOT EXISTS mnote
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci
  `)

  await bootstrapConn.end()

  // notes
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id BIGINT PRIMARY KEY,
      title VARCHAR(50) NOT NULL,
      content MEDIUMTEXT,
      updatedAt BIGINT NULL,
      createAt BIGINT NULL,
      pinned TINYINT(1) NOT NULL DEFAULT 0
    )
  `)

  // reminders
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reminders (
      id BIGINT PRIMARY KEY,
      title VARCHAR(100) NOT NULL DEFAULT '',
      text MEDIUMTEXT NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      mode VARCHAR(20) NOT NULL DEFAULT 'NOTIFICATION',
      type VARCHAR(20) NOT NULL DEFAULT 'AFTER_MINUTES',

      minutes INT NULL,     -- AFTER_MINUTES 使用
      \`date\` DATE NULL,     -- DATE_TIME 使用
      \`time\` TIME NULL,     -- DATE_TIME / EVERY_DAYS 可选
      days INT NULL,        -- EVERY_DAYS 使用

      pinned TINYINT(1) NOT NULL DEFAULT 0,
      createAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      lastTriggeredAt BIGINT NULL
    )
  `)

  // 索引
  await pool.execute(`CREATE INDEX idx_reminders_enabled ON reminders(enabled)`).catch(() => {})
  await pool.execute(`CREATE INDEX idx_reminders_updatedAt ON reminders(updatedAt)`).catch(() => {})

  // 兼容旧库补列（存在会报错，catch 吃掉即可）
  await pool.execute(`ALTER TABLE notes ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {})

  await pool.execute(`ALTER TABLE reminders ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders ADD COLUMN minutes INT NULL`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders ADD COLUMN \`date\` DATE NULL`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders ADD COLUMN \`time\` TIME NULL`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders ADD COLUMN days INT NULL`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders MODIFY COLUMN \`date\` DATE NULL`).catch(() => {})
  await pool.execute(`ALTER TABLE reminders MODIFY COLUMN \`time\` TIME NULL`).catch(() => {})
  await pool.execute(`
    ALTER TABLE reminders
    ADD COLUMN lastTriggeredAt BIGINT NULL
  `).catch((e) => {
    console.error('[schema] add lastTriggeredAt failed:', e)
  })
}