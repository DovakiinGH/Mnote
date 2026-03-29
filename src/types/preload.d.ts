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
        submitMandatoryReminder: (payload: { text: string }, channel: string) => Promise<boolean>,
        onRemindersChanged: (cb: () => void) => void

        pomodoroStart: (data: {id: number; title: string; text: string; minutes: number}) => Promise<boolean>
        pomodoroStop: () => Promise<boolean>
        pomodoroFinished: () => Promise<boolean>
        onPomodoroInit: (cb: (data: {title: string;text: string;minutes: number}) => void) => void
        onPomodoroClosed: (cb: (id: number) => void) => void

        settingsOpen: () => Promise<boolean>        
        settingsClose: () => Promise<boolean>
        settingsSave: (settings: { language: string; closeAction: string }) => Promise<boolean>
        onSettingsChanged: (cb: (settings: { language: string; closeAction: string }) => void) => void
        settingsGet: () => Promise<{ language: string; closeAction: string }>
       
    }
  }
}