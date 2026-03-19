import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
contextBridge.exposeInMainWorld('api', {
  notesGetAll: () => ipcRenderer.invoke('notes:getAll'),
  notesUpsert: (note: { id: number; title: string; content: string; updatedAt: number }) =>
    ipcRenderer.invoke('notes:upsert', note),
  notesDelete: (id: number) => ipcRenderer.invoke('notes:delete', id),
  notesCreate: () => ipcRenderer.invoke('notes:create'),
  reminderGetAll:()=> ipcRenderer.invoke('reminders:getAll'),
  reminderUpsert:(payload:any)=>ipcRenderer.invoke('reminders:upsert',payload),
  reminderDelete: (id: number) => ipcRenderer.invoke('reminders:delete', id),
  reminderCreate: () => ipcRenderer.invoke('reminder:create'),

  onSaveBeforeClose: (cb: () => void) => ipcRenderer.on('app:save-before-close', cb),
  notifySaveDone: () => ipcRenderer.send('app:save-done'),
  shortcutGet: () => ipcRenderer.invoke('shortcut:get'),
  shortcutUpdate: (accelerator: string) =>
    ipcRenderer.invoke('shortcut:update', accelerator),
  quickNoteUpdate: (note: { title: string; content: string }) =>
    ipcRenderer.send('quick:note:update', note),
  onNotesChanged: (cb: () => void) =>
    ipcRenderer.on('notes:changed', () => cb()),
  showReminder: (payload: { title: string; body: string }) =>
    ipcRenderer.invoke('reminder:show', payload),
  openMandatoryReminder: (text: string) => ipcRenderer.invoke('reminder:open-mandatory', text),
  submitMandatoryReminder: (payload: { text: string }) =>
  ipcRenderer.invoke('reminder:submit-mandatory', payload),
  onRemindersChanged: (cb: () => void) => {
  ipcRenderer.on('reminders:changed', () => cb())
},
})
//cb for call back function
