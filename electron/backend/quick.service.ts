import { saveNoteService } from '../backend/notes.service'

export type QuickNote = {
  title: string
  content: string
}

let quickDraft: QuickNote = { title: '', content: '' }

export function updateQuickNote(note: QuickNote) {
  quickDraft = {
    title: note?.title ?? '',
    content: note?.content ?? ''
  }
}

export function clearQuickNote() {
  quickDraft = { title: '', content: '' }
}

export async function saveQuickNote(): Promise<void> {
  const title = quickDraft.title?.trim() ?? ''
  const content = quickDraft.content ?? ''

  if (!title && !content) return 

  const now = Date.now()
  const id = now

  await saveNoteService({
    id,
    title: title || 'Untitled',
    content,
    createAt: now,
    updatedAt: now,
    pinned: 0
  })

  clearQuickNote()
}