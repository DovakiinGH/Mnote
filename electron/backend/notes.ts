import { pool } from './db'

export type Note = {
  id: number
  title: string
  content: string
  updatedAt?: number | null
  createAt?: number | null
}

export async function getAllNotes() {
  const [rows] = await pool.execute(
    'SELECT id, title, content, updatedAt, createAt FROM notes ORDER BY updatedAt IS NULL, updatedAt DESC'
  )
  return rows
}

export async function upsertNote(note: Note) {
  const { id, title, content, updatedAt,createAt } = note
  await pool.execute(
    `INSERT INTO notes (id, title, content, updatedAt,createAt)
     VALUES (?, ?, ?, ?,?)
     ON DUPLICATE KEY UPDATE
     title=VALUES(title), content=VALUES(content), updatedAt=VALUES(updatedAt), createAt=VALUES(createAt)`,
    [id, title, content, updatedAt?? null, createAt?? null]
  )
  return true
}

export async function deleteNote(id: number) {
  await pool.execute('DELETE FROM notes WHERE id = ?', [id])
  return true
}