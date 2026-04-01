"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("api", {
  windowMinimize: () => electron.ipcRenderer.send("window:minimize"),
  windowToggleMaximize: () => electron.ipcRenderer.send("window:toggle-maximize"),
  windowClose: () => electron.ipcRenderer.send("window:close"),
  notesGetAll: () => electron.ipcRenderer.invoke("notes:getAll"),
  notesUpsert: (note) => electron.ipcRenderer.invoke("notes:upsert", note),
  notesDelete: (id) => electron.ipcRenderer.invoke("notes:delete", id),
  notesCreate: () => electron.ipcRenderer.invoke("notes:create"),
  reminderGetAll: () => electron.ipcRenderer.invoke("reminders:getAll"),
  reminderUpsert: (payload) => electron.ipcRenderer.invoke("reminders:upsert", payload),
  reminderDelete: (id) => electron.ipcRenderer.invoke("reminders:delete", id),
  reminderCreate: () => electron.ipcRenderer.invoke("reminder:create"),
  onSaveBeforeClose: (cb) => electron.ipcRenderer.on("app:save-before-close", cb),
  notifySaveDone: () => electron.ipcRenderer.send("app:save-done"),
  shortcutGet: () => electron.ipcRenderer.invoke("shortcut:get"),
  shortcutUpdate: (accelerator) => electron.ipcRenderer.invoke("shortcut:update", accelerator),
  quickNoteUpdate: (note) => electron.ipcRenderer.send("quick:note:update", note),
  quickNoteClose: () => electron.ipcRenderer.send("quick:note:close"),
  onNotesChanged: (cb) => electron.ipcRenderer.on("notes:changed", () => cb()),
  // showReminder: (payload: { title: string; body: string }) =>
  //   ipcRenderer.invoke('reminder:show', payload),
  // openMandatoryReminder: (text: string) => ipcRenderer.invoke('reminder:open-mandatory', text),
  submitMandatoryReminder: (payload, channel) => electron.ipcRenderer.invoke(channel, payload),
  onRemindersChanged: (cb) => {
    electron.ipcRenderer.on("reminders:changed", () => cb());
  },
  //cb for call back function
  pomodoroStart: (data) => electron.ipcRenderer.invoke("pomodoro-start", data),
  pomodoroStop: () => electron.ipcRenderer.invoke("pomodoro-stop"),
  pomodoroFinished: () => electron.ipcRenderer.invoke("pomodoro-finished"),
  onPomodoroClosed: (cb) => electron.ipcRenderer.on("pomodoro-closed", (_event, id) => cb(id)),
  settingsOpen: () => electron.ipcRenderer.invoke("settings-open"),
  settingsClose: () => electron.ipcRenderer.invoke("settings-close"),
  //renderer to main; let main know user saved settings and pass the settings data
  settingsSave: (settings) => electron.ipcRenderer.invoke("settings-save", settings),
  //main to renderer; let renderer know settings changed
  onSettingsChanged: (cb) => electron.ipcRenderer.on("settings-changed", (_event, settings) => cb(settings)),
  settingsGet: () => electron.ipcRenderer.invoke("settings-get")
});
