export {}

declare global {
  interface Window {
    api: {
        notesGetAll: () => Promise<any[]>
        notesUpsert: (note: { id: number; title: string; content: string; updatedAt: number|null, createAt?: number | null,pinned?: number | boolean }) => Promise<boolean>
        notesDelete: (id: number) => Promise<boolean>
        notesCreate: () => Promise<any>

        reminderGetAll: () => Promise<any[]>
        reminderUpsert: (payload: any) => Promise<boolean>
        reminderDelete: (id: number) => Promise<boolean>
        reminderCreate: () => Promise<any>

        onSaveBeforeClose: (cb: () => void) => void
        notifySaveDone: () => void
        shortcutGet: () => Promise<string>
        shortcutUpdate: (accelerator: string) => Promise<boolean>
        quickNoteUpdate: (draft: { title: string; content: string }) => void
        onNotesChanged: (cb: () => void) => void
        showReminder: (payload: { title: string; body: string }) => Promise<boolean>
        openMandatoryReminder: (text: string) => Promise<boolean>
        submitMandatoryReminder: (payload: { text: string }) => Promise<boolean>

       
    }
  }
}