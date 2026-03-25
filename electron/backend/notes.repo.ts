import db from './db'

export type Note = {
  id: number
  title: string
  content: string
  updatedAt?: number | null
  createAt?: number | null
  pinned?: number | boolean
}

export function getAllNotes(): Note[] {
  return db.prepare(
    'SELECT id, title, content, updatedAt, createAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC'
  ).all() as Note[]
}

export function upsertNote(note: Note) {
  const { id, title, content, updatedAt, createAt, pinned } = note
  db.prepare(`
    INSERT INTO notes (id, title, content, updatedAt, createAt, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updatedAt = excluded.updatedAt,
      createAt = excluded.createAt,
      pinned = excluded.pinned
  `).run(id, title, content, updatedAt ?? null, createAt ?? null, pinned ? 1 : 0)
  return true
}

export function findAllNotes(): Note[] {
  return db.prepare(
    'SELECT id, title, content, createAt, updatedAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC'
  ).all() as Note[]
}

export function deleteNote(id: number) {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  return true
}