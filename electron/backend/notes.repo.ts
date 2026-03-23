import { pool } from './db'

export type Note = {
  id: number
  title: string
  content: string
  updatedAt?: number | null
  createAt?: number | null
  pinned?: number | boolean
}

export async function getAllNotes() {
  const [rows] = await pool.execute(
    'SELECT id, title, content, updatedAt, createAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC;'
  )
  return rows
}

export async function upsertNote(note: Note) {
  const { id, title, content, updatedAt,createAt,pinned } = note
  await pool.execute(
    `INSERT INTO notes (id, title, content, updatedAt, createAt, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    title=VALUES(title),
    content=VALUES(content),
    updatedAt=VALUES(updatedAt),
    createAt=VALUES(createAt),
    pinned=VALUES(pinned)`,
    [id, title, content, updatedAt ?? null, createAt ?? null, pinned ? 1 : 0]
  )
  return true
}
export async function findAllNotes(): Promise<Note[]> {
  const [rows] = await pool.query(`
    SELECT id, title, content, createAt, updatedAt, pinned
    FROM notes
    ORDER BY pinned DESC, updatedAt DESC
  `)
  return rows as Note[]
}
export async function deleteNote(id: number) {
  await pool.execute('DELETE FROM notes WHERE id = ?', [id])
  return true
}