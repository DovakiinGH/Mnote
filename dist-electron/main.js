import { app, screen, BrowserWindow, ipcMain, globalShortcut, Notification, Menu, nativeImage, Tray } from "electron";
import { fileURLToPath } from "node:url";
import { randomUUID } from "crypto";
import path from "node:path";
import Database from "better-sqlite3";
import fs from "node:fs";
function getDbPath() {
  const dir = app.isPackaged ? app.getPath("userData") : process.cwd();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "mnote.db");
}
const dbPath = getDbPath();
console.log("[db] SQLite path:", dbPath);
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      updatedAt INTEGER,
      createAt INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'NOTIFICATION',
      type TEXT NOT NULL DEFAULT 'AFTER_MINUTES',

      minutes INTEGER,          -- AFTER_MINUTES 使用
      date TEXT,                -- DATE_TIME 使用（存 "YYYY-MM-DD"）
      time TEXT,                -- DATE_TIME / EVERY_DAYS 可选（存 "HH:mm:ss"）
      days INTEGER,             -- EVERY_DAYS 使用

      pinned INTEGER NOT NULL DEFAULT 0,
      createAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastTriggeredAt INTEGER
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_reminders_updatedAt ON reminders(updatedAt)`);
  console.log("[schema] SQLite tables ready");
}
function getAllReminders() {
  return db.prepare(`
    SELECT * FROM reminders ORDER BY updatedAt DESC
  `).all();
}
function upsertReminder(input) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO reminders
      (id, title, text, enabled, mode, type, minutes, date, time, days, pinned, createAt, updatedAt, lastTriggeredAt)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      text = excluded.text,
      enabled = excluded.enabled,
      mode = excluded.mode,
      type = excluded.type,
      minutes = excluded.minutes,
      date = excluded.date,
      time = excluded.time,
      days = excluded.days,
      pinned = excluded.pinned,
      updatedAt = excluded.updatedAt,
      lastTriggeredAt = COALESCE(excluded.lastTriggeredAt, lastTriggeredAt)
  `).run(
    input.id,
    input.title,
    input.text,
    input.enabled,
    input.mode,
    input.type,
    input.minutes ?? null,
    input.date ?? null,
    input.time ?? null,
    input.days ?? null,
    input.pinned ?? 0,
    input.createAt ?? now,
    input.updatedAt ?? now,
    input.lastTriggeredAt ?? null
  );
  return true;
}
function deleteReminder(id) {
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);
  return true;
}
function getEnabledReminders() {
  return db.prepare(`
    SELECT * FROM reminders WHERE enabled = 1
  `).all();
}
function markTriggered(id, ts) {
  db.prepare(
    "UPDATE reminders SET lastTriggeredAt = ?, updatedAt = ? WHERE id = ?"
  ).run(ts, ts, id);
}
function disableReminder(id, ts) {
  db.prepare(
    "UPDATE reminders SET enabled = 0, updatedAt = ? WHERE id = ?"
  ).run(ts, id);
}
function dateToYmd(v) {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10);
  const y = v.getFullYear();
  const m = String(v.getMonth() + 1).padStart(2, "0");
  const d = String(v.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function normalizeTime(v) {
  if (!v) return "00:00:00";
  if (v.length === 5) return `${v}:00`;
  return v;
}
function toDateTimeTs(dateVal, timeVal) {
  const ymd = dateToYmd(dateVal);
  if (!ymd) return null;
  const hms = normalizeTime(timeVal);
  const ts = (/* @__PURE__ */ new Date(`${ymd}T${hms}`)).getTime();
  return Number.isNaN(ts) ? null : ts;
}
function getDueAt(row) {
  if (row.type === "AFTER_MINUTES") {
    const m = row.minutes ?? 1;
    return (row.updatedAt ?? row.createAt) + m * 60 * 1e3;
  }
  if (row.type === "DATE_TIME") {
    return toDateTimeTs(row.date, row.time);
  }
  const d = row.days ?? 1;
  const base = row.lastTriggeredAt ?? row.updatedAt ?? row.createAt;
  const nextDate = new Date(base);
  nextDate.setDate(nextDate.getDate() + d);
  const ymd = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
  const hms = normalizeTime(row.time);
  const ts = (/* @__PURE__ */ new Date(`${ymd}T${hms}`)).getTime();
  return Number.isNaN(ts) ? null : ts;
}
function isDue(row, now) {
  const dueAt = getDueAt(row);
  if (!dueAt) return false;
  if (now < dueAt) return false;
  if (row.lastTriggeredAt && row.lastTriggeredAt >= dueAt) return false;
  return true;
}
function createReminderScheduler(notify, onChanged) {
  let timer = null;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const now = Date.now();
      const rows = getEnabledReminders();
      let changed = false;
      for (const row of rows) {
        if (!isDue(row, now)) continue;
        await notify({
          title: row.title || "M Note",
          text: row.text || "",
          mode: row.mode
        });
        markTriggered(row.id, now);
        if (row.type === "AFTER_MINUTES" || row.type === "DATE_TIME") {
          disableReminder(row.id, now);
        }
        changed = true;
      }
      if (changed && onChanged) {
        onChanged();
      }
    } catch (err) {
      console.error("[scheduler.tick] failed:", err);
    } finally {
      running = false;
    }
  };
  return {
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(() => {
        void tick();
      }, 5e3);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
  };
}
const isProd = app.isPackaged;
const getResourcePath = (fileName) => {
  if (isProd) {
    return path.join(process.resourcesPath, fileName);
  }
  return path.join(process.cwd(), "resources", fileName);
};
let quickWin = null;
function openQuickWindow(VITE_DEV_SERVER_URL2, RENDERER_DIST2, __dirname, onBeforeClose) {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  if (quickWin && !quickWin.isDestroyed()) {
    quickWin.show();
    quickWin.focus();
    return;
  }
  let allowClose = false;
  quickWin = new BrowserWindow({
    width: Math.round(screenW * 0.45),
    height: Math.round(screenH * 0.55),
    show: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    icon: getResourcePath("icon.ico")
  });
  if (VITE_DEV_SERVER_URL2) {
    quickWin.loadURL(`${VITE_DEV_SERVER_URL2}#/quick`);
  } else {
    quickWin.loadFile(path.join(RENDERER_DIST2, "index.html"), { hash: "/quick" });
  }
  quickWin.once("ready-to-show", () => {
    quickWin == null ? void 0 : quickWin.show();
    quickWin == null ? void 0 : quickWin.focus();
  });
  quickWin.on("close", (e) => {
    if (allowClose) return;
    e.preventDefault();
    Promise.resolve(onBeforeClose == null ? void 0 : onBeforeClose()).finally(() => {
      allowClose = true;
      quickWin == null ? void 0 : quickWin.close();
    });
  });
  quickWin.on("closed", () => {
    quickWin = null;
  });
}
function upsertNote(note) {
  const { id, title, content, updatedAt, createAt, pinned } = note;
  db.prepare(`
    INSERT INTO notes (id, title, content, updatedAt, createAt, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updatedAt = excluded.updatedAt,
      createAt = excluded.createAt,
      pinned = excluded.pinned
  `).run(id, title, content, updatedAt ?? null, createAt ?? null, pinned ? 1 : 0);
  return true;
}
function findAllNotes() {
  return db.prepare(
    "SELECT id, title, content, createAt, updatedAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC"
  ).all();
}
function deleteNote(id) {
  db.prepare("DELETE FROM notes WHERE id = ?").run(id);
  return true;
}
function listNotesService() {
  return findAllNotes();
}
function saveNoteService(input) {
  const now = Date.now();
  upsertNote({
    ...input,
    title: (input.title ?? "").trim() || "Untitled",
    content: input.content ?? "",
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now,
    pinned: input.pinned ?? 0
  });
  return true;
}
function removeNoteService(id) {
  deleteNote(id);
  return true;
}
function createNoteService() {
  const now = Date.now();
  const id = now;
  const note = {
    id,
    title: "new",
    content: "",
    createAt: now,
    updatedAt: now,
    pinned: 0
  };
  saveNoteService(note);
  return note;
}
function normalizeReminderByType(f) {
  if (f.mode === "POMODORO") {
    return {
      type: "AFTER_MINUTES",
      minutes: Math.min(Math.max(f.minutes ?? 25, 1), 1440),
      date: null,
      time: null,
      days: null
    };
  }
  if (f.type === "AFTER_MINUTES") {
    return {
      type: f.type,
      minutes: Math.min(Math.max(f.minutes ?? 1, 1), 1440),
      date: null,
      time: null,
      days: null
    };
  }
  if (f.type === "DATE_TIME") {
    return { type: f.type, minutes: null, date: f.date ?? null, time: f.time ?? null, days: null };
  }
  return {
    type: f.type,
    minutes: null,
    date: null,
    time: f.time ?? null,
    days: Math.min(Math.max(f.days ?? 1, 1), 365)
  };
}
function listRemindersService() {
  return getAllReminders();
}
function saveReminderService(input) {
  const now = Date.now();
  const normalized = normalizeReminderByType(input);
  upsertReminder({
    ...input,
    ...normalized,
    title: (input.title ?? "").trim() || "Untitled",
    text: input.text ?? "",
    enabled: input.enabled ? 1 : 0,
    pinned: input.pinned ?? 0,
    createAt: input.createAt ?? now,
    updatedAt: input.updatedAt ?? now
  });
  return true;
}
function removeReminderService(id) {
  deleteReminder(id);
  return true;
}
function markReminderTriggeredService(id, ts = Date.now()) {
  markTriggered(id, ts);
  return true;
}
function createReminderService() {
  const now = Date.now();
  const id = now;
  const reminder = {
    id,
    title: "new",
    text: "",
    enabled: 0,
    mode: "NOTIFICATION",
    type: "AFTER_MINUTES",
    minutes: 5,
    date: null,
    time: null,
    days: null,
    createAt: now,
    updatedAt: now,
    pinned: 0,
    lastTriggeredAt: null
  };
  saveReminderService(reminder);
  return reminder;
}
let quickDraft = { title: "", content: "" };
function updateQuickNote(note) {
  quickDraft = {
    title: (note == null ? void 0 : note.title) ?? "",
    content: (note == null ? void 0 : note.content) ?? ""
  };
}
function clearQuickNote() {
  quickDraft = { title: "", content: "" };
}
async function saveQuickNote(mainWindow) {
  var _a;
  const title = ((_a = quickDraft.title) == null ? void 0 : _a.trim()) ?? "";
  const content = quickDraft.content ?? "";
  if (!title && !content) return;
  const now = Date.now();
  const id = now;
  saveNoteService({
    id,
    title: title || "Untitled",
    content,
    createAt: now,
    updatedAt: now,
    pinned: 0
  });
  mainWindow == null ? void 0 : mainWindow.webContents.send("notes:changed");
  clearQuickNote();
}
const __dirname$3 = path.dirname(fileURLToPath(import.meta.url));
let pomodoroWin = null;
let currentReminderId = null;
let onCloseCallback = null;
function setOnPomodoroClose(cb) {
  onCloseCallback = cb;
}
function openPomodoroWindow(data) {
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId);
    }
    pomodoroWin.destroy();
    pomodoroWin = null;
  }
  currentReminderId = data.id;
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  pomodoroWin = new BrowserWindow({
    width: Math.round(screenW * 0.25),
    height: Math.round(screenH * 0.35),
    resizable: true,
    alwaysOnTop: true,
    frame: false,
    icon: getResourcePath("icon.ico"),
    webPreferences: {
      preload: path.join(__dirname$3, "preload.mjs")
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro`);
  } else {
    pomodoroWin.loadFile(path.join(__dirname$3, "../dist/index.html"), {
      hash: "/pomodoro"
    });
  }
  const params = encodeURIComponent(JSON.stringify({
    title: data.title,
    text: data.text,
    minutes: data.minutes
  }));
  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro?data=${params}`);
  } else {
    pomodoroWin.loadFile(path.join(__dirname$3, "../dist/index.html"), {
      hash: `/pomodoro?data=${params}`
    });
  }
  pomodoroWin.on("closed", () => {
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId);
    }
    pomodoroWin = null;
    currentReminderId = null;
  });
}
function closePomodoroWindow() {
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    const win2 = pomodoroWin;
    pomodoroWin = null;
    currentReminderId = null;
    win2.destroy();
  }
}
function setupPomodoroIpc() {
  ipcMain.handle("pomodoro-finished", () => {
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId);
    }
    closePomodoroWindow();
    return true;
  });
}
const __dirname$2 = path.dirname(fileURLToPath(import.meta.url));
let settingsWin = null;
let mainWin = null;
function initSettings(win2) {
  mainWin = win2;
}
function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.focus();
    return;
  }
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  settingsWin = new BrowserWindow({
    width: Math.round(screenW * 0.45),
    height: Math.round(screenH * 0.55),
    resizable: false,
    modal: true,
    alwaysOnTop: true,
    center: true,
    parent: mainWin ?? void 0,
    icon: getResourcePath("icon.ico"),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname$2, "preload.mjs")
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/settings`);
  } else {
    settingsWin.loadFile(path.join(__dirname$2, "../dist/index.html"), {
      hash: "/settings"
    });
  }
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}
function closeSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.destroy();
    settingsWin = null;
  }
}
function setupSettingsIpc() {
  ipcMain.handle("settings-open", () => {
    openSettingsWindow();
    return true;
  });
  ipcMain.handle("settings-close", () => {
    closeSettingsWindow();
    return true;
  });
  ipcMain.handle("settings-save", (_event, settings) => {
    mainWin == null ? void 0 : mainWin.webContents.send("settings-changed", settings);
    return true;
  });
}
console.log("[main] main.ts loaded");
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let isQuitting = false;
let tray = null;
let currentShortcut = "Alt+Space";
if (process.platform === "win32") {
  app.setAppUserModelId("com.yourapp.mnote");
}
app.setName("MNote");
function createWindow() {
  win = new BrowserWindow({
    icon: getResourcePath("icon.ico"),
    title: "MNote",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#/`);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"), { hash: "/" });
  }
  initSettings(win);
}
function resolveResourcePath(fileName) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, fileName);
  }
  return path.join(process.cwd(), "resources", fileName);
}
function requestQuitWithSave() {
  win == null ? void 0 : win.webContents.send("app:save-before-close");
  setTimeout(() => {
    if (!isQuitting) {
      isQuitting = true;
      app.quit();
    }
  }, 1e4);
}
function createTray() {
  const trayIconPath = resolveResourcePath("tray.ico");
  const trayIcon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayIcon);
  tray.setToolTip("MNote");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Main Window",
      click: () => {
        if (!win) return;
        win.show();
        win.focus();
      }
    },
    {
      label: "Exit",
      click: () => {
        requestQuitWithSave();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });
}
function registerHotkey(accelerator) {
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(accelerator, () => {
    console.log("[main] hotkey triggered:", accelerator);
    openQuickWindow(VITE_DEV_SERVER_URL, RENDERER_DIST, __dirname$1, () => saveQuickNote(win));
  });
  if (!ok) return false;
  currentShortcut = accelerator;
  return true;
}
const scheduler = createReminderScheduler(async (payload) => {
  if (payload.mode === "NOTIFICATION") {
    const n = new Notification({
      title: payload.title,
      body: payload.text
    });
    n.show();
  } else if (payload.mode === "POPUP_WINDOW") {
    openReminderMandatoryWindow(payload.text);
  } else if (payload.mode === "POMODORO") {
    const n = new Notification({
      title: payload.title,
      body: payload.text
    });
    n.show();
  }
}, () => {
  win == null ? void 0 : win.webContents.send("reminders:changed");
});
function openReminderMandatoryWindow(initialText) {
  const channel = `reminder:submit-mandatory:${randomUUID()}`;
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const hasParent = !!win && !win.isDestroyed();
  const popup = new BrowserWindow({
    width: Math.round(screenW * 0.6),
    height: Math.round(screenH * 0.65),
    ...hasParent ? { parent: win, modal: true } : {},
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    },
    icon: getResourcePath("icon.ico")
  });
  popup.show();
  popup.focus();
  if (VITE_DEV_SERVER_URL) {
    popup.loadURL(
      `${VITE_DEV_SERVER_URL}#/reminder-mandatory?text=${encodeURIComponent(initialText)}&channel=${channel}`
    );
  } else {
    popup.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: `/reminder-mandatory?text=${encodeURIComponent(initialText)}&channel=${channel}`
    });
  }
  let handled = false;
  popup.on("close", (event) => {
    if (!handled) event.preventDefault();
  });
  ipcMain.handleOnce(channel, async (_event, _payload) => {
    handled = true;
    popup.close();
    ipcMain.removeHandler(channel);
    return true;
  });
}
async function bootstrap() {
  try {
    await app.whenReady();
    console.log("[env] DB_HOST:", process.env.DB_HOST);
    console.log("[env] DB_USER:", process.env.DB_USER);
    console.log("[env] DB_PASSWORD:", process.env.DB_PASSWORD ? "***有值***" : "***空***");
    console.log("[env] DB_NAME:", process.env.DB_NAME);
    initSchema();
    console.log("[main] schema init ok");
    ipcMain.on("app:save-done", () => {
      isQuitting = true;
      win == null ? void 0 : win.close();
    });
    ipcMain.handle("shortcut:update", (_event, accelerator) => {
      return registerHotkey(accelerator);
    });
    ipcMain.handle("shortcut:get", () => currentShortcut);
    ipcMain.on("quick:note:update", (_event, note) => {
      updateQuickNote(note);
    });
    ipcMain.handle("reminder:show", (_event, payload) => {
      const n = new Notification({
        title: payload.title || "Reminder",
        body: payload.body || ""
      });
      n.show();
      return true;
    });
    ipcMain.handle("reminder:open-mandatory", (_e, text) => {
      openReminderMandatoryWindow(text || "");
      return true;
    });
    ipcMain.handle("notes:getAll", async () => listNotesService());
    ipcMain.handle("notes:upsert", async (_e, payload) => saveNoteService(payload));
    ipcMain.handle("notes:delete", async (_e, id) => removeNoteService(id));
    ipcMain.handle("notes:create", async () => createNoteService());
    ipcMain.handle("reminders:getAll", async () => listRemindersService());
    ipcMain.handle("reminders:upsert", async (_e, payload) => saveReminderService(payload));
    ipcMain.handle("reminders:delete", async (_e, id) => removeReminderService(id));
    ipcMain.handle("reminder:create", async () => createReminderService());
    ipcMain.handle(
      "reminders:markTriggered",
      async (_e, id, ts) => markReminderTriggeredService(id, ts)
    );
    setupPomodoroIpc();
    ipcMain.handle("pomodoro-start", (_event, data) => {
      openPomodoroWindow(data);
      return true;
    });
    ipcMain.handle("pomodoro-stop", () => {
      closePomodoroWindow();
      return true;
    });
    setOnPomodoroClose((id) => {
      win == null ? void 0 : win.webContents.send("pomodoro-closed", id);
    });
    setupSettingsIpc();
    Menu.setApplicationMenu(null);
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
    } else {
      app.on("second-instance", () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          if (!win.isVisible()) win.show();
          win.focus();
        }
      });
      app.whenReady().then(createWindow);
    }
    registerHotkey(currentShortcut);
    createTray();
    scheduler.start();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (err) {
    console.error("[main] bootstrap failed:", err);
    app.quit();
  }
}
bootstrap();
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("before-quit", () => {
  isQuitting = true;
});
app.on("will-quit", () => {
  scheduler.stop();
  globalShortcut.unregisterAll();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
