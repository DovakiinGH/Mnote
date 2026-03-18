import {
  findAllNotes,
  upsertNote,
  deleteNote,
  type Note
 
} from './notes.repo'

export async function listNotesService() {
  return findAllNotes()
}
export async function saveNoteService(input: Note) {
  const now = Date.now()
  await upsertNote({
    ...input,
    title: (input.title ?? '').trim() || 'Untitled',
    content: input.content ?? '',
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now,
    pinned: input.pinned ?? 0
  })
  return true
}

export async function removeNoteService(id: number) {
  await deleteNote(id)
  return true
}

export async function createNoteService() {
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

  await saveNoteService(note)
  return note
}