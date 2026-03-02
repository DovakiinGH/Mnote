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
  notesGetAll: () => electron.ipcRenderer.invoke("notes:getAll"),
  notesUpsert: (note) => electron.ipcRenderer.invoke("notes:upsert", note),
  notesDelete: (id) => electron.ipcRenderer.invoke("notes:delete", id),
  onSaveBeforeClose: (cb) => electron.ipcRenderer.on("app:save-before-close", cb),
  notifySaveDone: () => electron.ipcRenderer.send("app:save-done")
});
