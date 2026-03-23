import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function getDbPath(): string {
  // 打包后：用户数据目录（C:\Users\xxx\AppData\Roaming\MNote\）
  // 开发时：项目根目录
  const dir = app.isPackaged
    ? app.getPath('userData')
    : process.cwd()

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return path.join(dir, 'mnote.db')
}

const dbPath = getDbPath()
console.log('[db] SQLite path:', dbPath)

const db = new Database(dbPath)

// 开启 WAL 模式，提升并发性能
db.pragma('journal_mode = WAL')

export default db