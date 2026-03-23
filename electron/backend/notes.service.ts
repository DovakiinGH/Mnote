import {
  findAllNotes,
  upsertNote,
  deleteNote,
  type Note
} from './notes.repo'

export function listNotesService() {
  return findAllNotes()
}

export function saveNoteService(input: Note) {
  const now = Date.now()
  upsertNote({
    ...input,
    title: (input.title ?? '').trim() || 'Untitled',
    content: input.content ?? '',
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now,
    pinned: input.pinned ?? 0
  })
  return true
}

export function removeNoteService(id: number) {
  deleteNote(id)
  return true
}

export function createNoteService() {
  const now = Date.now()
  const id = now

  const note = {
    id,
    title: 'new',
    content: '',
    createAt: now,
    updatedAt: now,
    pinned: 0
  }

  saveNoteService(note)
  return note
}