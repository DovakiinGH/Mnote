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
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

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
  quickNoteClose: () => ipcRenderer.send('quick:note:close'),
  onNotesChanged: (cb: () => void) =>
    ipcRenderer.on('notes:changed', () => cb()),
  // showReminder: (payload: { title: string; body: string }) =>
  //   ipcRenderer.invoke('reminder:show', payload),
  // openMandatoryReminder: (text: string) => ipcRenderer.invoke('reminder:open-mandatory', text),
  submitMandatoryReminder: (payload: { text: string }, channel: string) =>
  ipcRenderer.invoke(channel, payload),
  onRemindersChanged: (cb: () => void) => {
  ipcRenderer.on('reminders:changed', () => cb())},//cb for call back function
  
  pomodoroStart: (data: { id: number; title: string; text: string; minutes: number }) =>
    ipcRenderer.invoke('pomodoro-start', data),
  pomodoroStop: () =>
    ipcRenderer.invoke('pomodoro-stop'),
  pomodoroFinished: () =>
    ipcRenderer.invoke('pomodoro-finished'),
  onPomodoroClosed: (cb: (id: number) => void) =>
    ipcRenderer.on('pomodoro-closed', (_event, id) => cb(id)),
  
  settingsOpen: () => ipcRenderer.invoke('settings-open'),
  settingsClose: () => ipcRenderer.invoke('settings-close'),
  //renderer to main; let main know user saved settings and pass the settings data
  settingsSave: (settings: { language: string; closeAction: string }) =>
    ipcRenderer.invoke('settings-save', settings),
  //main to renderer; let renderer know settings changed
  onSettingsChanged: (cb: (settings: { language: string; closeAction: string }) => void) =>
    ipcRenderer.on('settings-changed', (_event, settings) => cb(settings)),
  settingsGet: () => ipcRenderer.invoke('settings-get'),
  })


