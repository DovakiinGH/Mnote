import mysql from 'mysql2/promise'
import { pool } from './db'

export async function initSchema() {
  // 1) 先连接 MySQL 服务本身（不选库）
  const bootstrapConn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '20040701'
  })

  // 2) 建库（已存在则跳过）
  await bootstrapConn.execute(`
    CREATE DATABASE IF NOT EXISTS mnote
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci
  `)

  await bootstrapConn.end()

  // 3) 再建表（这里用的是 db.ts 里连 mnote 的 pool）
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

  try {
        await pool.execute(`
          ALTER TABLE notes
          ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0
        `)
      } catch (e) {
      }
}