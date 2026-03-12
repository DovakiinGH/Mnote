export {}

declare global {
  interface Window {
    api: {
        notesGetAll: () => Promise<any[]>
        notesUpsert: (note: { id: number; title: string; content: string; updatedAt: number|null, createAt?: number | null,pinned?: number | boolean }) => Promise<boolean>
        notesDelete: (id: number) => Promise<boolean>
        onSaveBeforeClose: (cb: () => void) => void
        notifySaveDone: () => void
        shortcutGet: () => Promise<string>
        shortcutUpdate: (accelerator: string) => Promise<boolean>
        quickNoteUpdate: (draft: { title: string; content: string }) => void
        onNotesChanged: (cb: () => void) => void
    }
  }
}