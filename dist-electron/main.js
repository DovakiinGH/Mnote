import { app as l, screen as x, BrowserWindow as E, ipcMain as i, globalShortcut as _, Menu as X, nativeImage as Z, Tray as ee, Notification as V } from "electron";
import { fileURLToPath as F } from "node:url";
import s from "node:path";
import te from "better-sqlite3";
import S from "node:fs";
import { randomUUID as ne } from "crypto";
function re() {
  const e = l.isPackaged ? l.getPath("userData") : process.cwd();
  return S.existsSync(e) || S.mkdirSync(e, { recursive: !0 }), s.join(e, "mnote.db");
}
const G = re();
console.log("[db] SQLite path:", G);
const f = new te(G);
f.pragma("journal_mode = WAL");
function oe() {
  f.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      updatedAt INTEGER,
      createAt INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0
    )
  `), f.exec(`
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
  `), f.exec("CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled)"), f.exec("CREATE INDEX IF NOT EXISTS idx_reminders_updatedAt ON reminders(updatedAt)"), console.log("[schema] SQLite tables ready");
}
function ie() {
  return f.prepare(`
    SELECT * FROM reminders ORDER BY updatedAt DESC
  `).all();
}
function se(e) {
  const r = Date.now();
  return f.prepare(`
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
    e.id,
    e.title,
    e.text,
    e.enabled,
    e.mode,
    e.type,
    e.minutes ?? null,
    e.date ?? null,
    e.time ?? null,
    e.days ?? null,
    e.pinned ?? 0,
    e.createAt ?? r,
    e.updatedAt ?? r,
    e.lastTriggeredAt ?? null
  ), !0;
}
function de(e) {
  return f.prepare("DELETE FROM reminders WHERE id = ?").run(e), !0;
}
function le() {
  return f.prepare(`
    SELECT * FROM reminders WHERE enabled = 1
  `).all();
}
function C(e, r) {
  f.prepare("UPDATE reminders SET lastTriggeredAt = ? WHERE id = ?").run(r, e);
}
function ae(e, r) {
  f.prepare(
    "UPDATE reminders SET enabled = 0, updatedAt = ? WHERE id = ?"
  ).run(r, e);
}
function ce(e) {
  if (!e) return null;
  if (typeof e == "string") return e.slice(0, 10);
  const r = e.getFullYear(), n = String(e.getMonth() + 1).padStart(2, "0"), t = String(e.getDate()).padStart(2, "0");
  return `${r}-${n}-${t}`;
}
function Q(e) {
  return e ? e.length === 5 ? `${e}:00` : e : "00:00:00";
}
function ue(e, r) {
  const n = ce(e);
  if (!n) return null;
  const t = Q(r), a = (/* @__PURE__ */ new Date(`${n}T${t}`)).getTime();
  return Number.isNaN(a) ? null : a;
}
function me(e) {
  if (e.type === "AFTER_MINUTES") {
    const h = e.minutes ?? 1;
    return (e.updatedAt ?? e.createAt) + h * 60 * 1e3;
  }
  if (e.type === "DATE_TIME")
    return ue(e.date, e.time);
  const r = e.days ?? 1, n = e.lastTriggeredAt ?? e.updatedAt ?? e.createAt, t = new Date(n);
  t.setDate(t.getDate() + r);
  const a = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`, c = Q(e.time), T = (/* @__PURE__ */ new Date(`${a}T${c}`)).getTime();
  return Number.isNaN(T) ? null : T;
}
function fe(e, r) {
  const n = me(e);
  return !(!n || r < n || e.lastTriggeredAt && e.lastTriggeredAt >= n);
}
function pe(e, r) {
  let n = null, t = !1;
  const a = async () => {
    if (!t) {
      t = !0;
      try {
        const c = Date.now(), T = le();
        let h = !1;
        for (const u of T)
          fe(u, c) && (await e({
            title: u.title || "M Note",
            text: u.text || "",
            mode: u.mode
          }), C(u.id, c), (u.type === "AFTER_MINUTES" || u.type === "DATE_TIME") && ae(u.id, c), h = !0);
        h && r && r();
      } catch (c) {
        console.error("[scheduler.tick] failed:", c);
      } finally {
        t = !1;
      }
    }
  };
  return {
    start() {
      n || (a(), n = setInterval(() => {
        a();
      }, 5e3));
    },
    stop() {
      n && (clearInterval(n), n = null);
    }
  };
}
const Te = l.isPackaged, I = (e) => Te ? s.join(process.resourcesPath, e) : s.join(process.cwd(), "resources", e);
let d = null;
function Ee(e, r, n, t) {
  const { width: a, height: c } = x.getPrimaryDisplay().workAreaSize;
  if (d && !d.isDestroyed()) {
    d.show(), d.focus();
    return;
  }
  let T = !1;
  d = new E({
    width: Math.round(a * 0.45),
    height: Math.round(c * 0.55),
    show: !1,
    alwaysOnTop: !0,
    autoHideMenuBar: !0,
    resizable: !0,
    movable: !0,
    frame: !1,
    center: !0,
    webPreferences: {
      preload: s.join(n, "preload.mjs")
    },
    icon: I("icon.ico")
  }), e ? d.loadURL(`${e}#/quick`) : d.loadFile(s.join(r, "index.html"), { hash: "/quick" }), d.once("ready-to-show", () => {
    d == null || d.show(), d == null || d.focus();
  }), d.on("close", (h) => {
    T || (h.preventDefault(), Promise.resolve(t == null ? void 0 : t()).finally(() => {
      T = !0, d == null || d.close();
    }));
  }), d.on("closed", () => {
    d = null;
  });
}
function he() {
  d == null || d.close();
}
function ge(e) {
  const { id: r, title: n, content: t, updatedAt: a, createAt: c, pinned: T } = e;
  return f.prepare(`
    INSERT INTO notes (id, title, content, updatedAt, createAt, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updatedAt = excluded.updatedAt,
      createAt = excluded.createAt,
      pinned = excluded.pinned
  `).run(r, n, t, a ?? null, c ?? null, T ? 1 : 0), !0;
}
function Ae() {
  return f.prepare(
    "SELECT id, title, content, createAt, updatedAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC"
  ).all();
}
function ye(e) {
  return f.prepare("DELETE FROM notes WHERE id = ?").run(e), !0;
}
function Re() {
  return Ae();
}
function k(e) {
  const r = Date.now();
  return ge({
    ...e,
    title: (e.title ?? "").trim() || "Untitled",
    content: e.content ?? "",
    createAt: e.createAt ?? r,
    updatedAt: e.updatedAt ?? r,
    pinned: e.pinned ?? 0
  }), !0;
}
function Se(e) {
  return ye(e), !0;
}
function De() {
  const e = Date.now(), n = {
    id: e,
    title: "new",
    content: "",
    createAt: e,
    updatedAt: e,
    pinned: 0
  };
  return k(n), n;
}
function Ne(e) {
  return e.mode === "POMODORO" ? {
    type: "AFTER_MINUTES",
    minutes: Math.min(Math.max(e.minutes ?? 25, 1), 1440),
    date: null,
    time: null,
    days: null
  } : e.type === "AFTER_MINUTES" ? {
    type: e.type,
    minutes: Math.min(Math.max(e.minutes ?? 1, 1), 1440),
    date: null,
    time: null,
    days: null
  } : e.type === "DATE_TIME" ? { type: e.type, minutes: null, date: e.date ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), time: e.time ?? null, days: null } : {
    type: e.type,
    minutes: null,
    date: null,
    time: e.time ?? null,
    days: Math.min(Math.max(e.days ?? 1, 1), 365)
  };
}
function Ie() {
  return ie();
}
function q(e) {
  const r = Date.now(), n = Ne(e);
  return se({
    ...e,
    ...n,
    title: (e.title ?? "").trim() || "Untitled",
    text: e.text ?? "",
    enabled: e.enabled ? 1 : 0,
    pinned: e.pinned ?? 0,
    createAt: e.createAt ?? r,
    updatedAt: e.updatedAt ?? r
  }), !0;
}
function we(e) {
  return de(e), !0;
}
function Le(e, r = Date.now()) {
  return C(e, r), !0;
}
function Oe() {
  const e = Date.now(), n = {
    id: e,
    title: "new",
    text: "",
    enabled: 0,
    mode: "NOTIFICATION",
    type: "AFTER_MINUTES",
    minutes: 5,
    date: null,
    time: null,
    days: null,
    createAt: e,
    updatedAt: e,
    pinned: 0,
    lastTriggeredAt: null
  };
  return q(n), n;
}
let b = { title: "", content: "" };
function _e(e) {
  b = {
    title: (e == null ? void 0 : e.title) ?? "",
    content: (e == null ? void 0 : e.content) ?? ""
  };
}
function be() {
  b = { title: "", content: "" };
}
async function xe(e) {
  var c;
  const r = ((c = b.title) == null ? void 0 : c.trim()) ?? "", n = b.content ?? "";
  if (!r && !n) return;
  const t = Date.now();
  k({
    id: t,
    title: r || "Untitled",
    content: n,
    createAt: t,
    updatedAt: t,
    pinned: 0
  }), e == null || e.webContents.send("notes:changed"), be();
}
const P = s.dirname(F(import.meta.url));
let m = null, g = null, A = null;
function Me(e) {
  A = e;
}
function Ue(e) {
  m && !m.isDestroyed() && (g !== null && A && !A.isDestroyed() && A.webContents.send("pomodoro-closed", g), m.destroy(), m = null), g = e.id;
  const { width: r, height: n } = x.getPrimaryDisplay().workAreaSize;
  m = new E({
    width: Math.round(r * 0.25),
    height: Math.round(n * 0.35),
    resizable: !0,
    alwaysOnTop: !0,
    frame: !1,
    icon: I("icon.ico"),
    webPreferences: {
      preload: s.join(P, "preload.mjs")
    }
  }), C(e.id, Date.now()), process.env.VITE_DEV_SERVER_URL ? m.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro`) : m.loadFile(s.join(P, "../dist/index.html"), {
    hash: "/pomodoro"
  });
  const t = encodeURIComponent(JSON.stringify({
    title: e.title,
    text: e.text,
    minutes: e.minutes
  }));
  process.env.VITE_DEV_SERVER_URL ? m.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro?data=${t}`) : m.loadFile(s.join(P, "../dist/index.html"), {
    hash: `/pomodoro?data=${t}`
  }), m.on("closed", () => {
    g !== null && A && !A.isDestroyed() && A.webContents.send("pomodoro-closed", g), m = null, g = null;
  });
}
function W() {
  if (m && !m.isDestroyed()) {
    const e = m;
    m = null, g = null, e.destroy();
  }
}
function Pe() {
  return g;
}
const z = s.dirname(F(import.meta.url));
let p = null, B = null;
function ve(e) {
  B = e;
}
function Fe() {
  if (p && !p.isDestroyed()) {
    p.focus();
    return;
  }
  const { width: e, height: r } = x.getPrimaryDisplay().workAreaSize;
  p = new E({
    width: Math.round(e * 0.45),
    height: Math.round(r * 0.55),
    resizable: !1,
    movable: !1,
    modal: !0,
    alwaysOnTop: !0,
    center: !0,
    parent: B ?? void 0,
    icon: I("icon.ico"),
    frame: !1,
    webPreferences: {
      preload: s.join(z, "preload.mjs")
    }
  }), process.env.VITE_DEV_SERVER_URL ? p.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/settings`) : p.loadFile(s.join(z, "../dist/index.html"), {
    hash: "/settings"
  }), p.on("closed", () => {
    p = null;
  });
}
function Ce() {
  p && !p.isDestroyed() && (p.destroy(), p = null);
}
const Y = {
  language: "en-US",
  closeAction: "tray",
  autoLaunch: !1,
  shortCut: "Ctrl+Space"
}, v = s.join(l.getPath("userData"), "settings.json");
function ke() {
  try {
    if (S.existsSync(v)) {
      const e = S.readFileSync(v, "utf-8");
      return { ...Y, ...JSON.parse(e) };
    }
  } catch (e) {
    console.error("[settings] load failed:", e);
  }
  return { ...Y };
}
function $e(e) {
  try {
    S.writeFileSync(v, JSON.stringify(e, null, 2), "utf-8");
  } catch (r) {
    console.error("[settings] save failed:", r);
  }
}
let O = null;
function je(e) {
  O = e;
}
function Ve(e, r, n, t) {
  const a = `reminder:submit-mandatory:${ne()}`, { width: c, height: T } = x.getPrimaryDisplay().workAreaSize, h = !!O && !O.isDestroyed(), u = new E({
    width: Math.round(c * 0.5),
    height: Math.round(T * 0.55),
    ...h ? { parent: O, modal: !0 } : {},
    center: !0,
    resizable: !1,
    minimizable: !1,
    maximizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !1,
    autoHideMenuBar: !0,
    frame: !1,
    webPreferences: {
      preload: s.join(n, "preload.mjs")
    },
    icon: I("icon.ico")
  });
  u.show(), u.focus(), e ? u.loadURL(
    `${e}#/reminder-mandatory?text=${encodeURIComponent(t)}&channel=${a}`
  ) : u.loadFile(s.join(r, "index.html"), {
    hash: `/reminder-mandatory?text=${encodeURIComponent(t)}&channel=${a}`
  });
  let $ = !1;
  u.on("close", (j) => {
    $ || j.preventDefault();
  }), i.handleOnce(a, async (j, He) => ($ = !0, u.close(), i.removeHandler(a), !0));
}
console.log("[main] main.ts loaded");
const M = s.dirname(F(import.meta.url));
process.env.APP_ROOT = s.join(M, "..");
const D = process.env.VITE_DEV_SERVER_URL, Ke = s.join(process.env.APP_ROOT, "dist-electron"), U = s.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = D ? s.join(process.env.APP_ROOT, "public") : U;
let o = null, N = !1, w = null, y = ke();
process.platform === "win32" && l.setAppUserModelId("MNote");
l.setName("MNote");
function H() {
  o = new E({
    icon: I("icon.ico"),
    title: "MNote",
    frame: !1,
    webPreferences: {
      preload: s.join(M, "preload.mjs")
    }
  }), o.on("close", (e) => {
    N || (y.closeAction === "tray" ? (e.preventDefault(), o == null || o.hide()) : y.closeAction === "quit" && (e.preventDefault(), J()));
  }), D ? o.loadURL(`${D}#/`) : o.loadFile(s.join(U, "index.html"), { hash: "/" }), ve(o), Me(o), je(o);
}
function We(e) {
  return l.isPackaged ? s.join(process.resourcesPath, e) : s.join(process.cwd(), "resources", e);
}
function J() {
  o == null || o.webContents.send("app:save-before-close"), setTimeout(() => {
    N || (N = !0, l.quit());
  }, 1e4);
}
function ze() {
  const e = We("tray.ico"), r = Z.createFromPath(e);
  w = new ee(r), w.setToolTip("MNote");
  const n = X.buildFromTemplate([
    {
      label: "Main Window",
      click: () => {
        o && (o.show(), o.focus());
      }
    },
    {
      label: "Exit",
      click: () => {
        J();
      }
    }
  ]);
  w.setContextMenu(n), w.on("click", () => {
    o && (o.isVisible() ? o.hide() : (o.show(), o.focus()));
  });
}
let R = "";
function L(e) {
  return _.unregisterAll(), e ? _.register(e, () => {
    console.log("[main] hotkey triggered:", e), Ee(D, U, M, () => xe(o));
  }) ? (R = e, !0) : (console.error("[main] hotkey register failed:", e), !1) : (R = "", !0);
}
const K = pe(async (e) => {
  e.mode === "NOTIFICATION" ? new V({
    title: e.title,
    body: e.text
  }).show() : e.mode === "POPUP_WINDOW" ? Ve(D, U, M, e.text) : e.mode === "POMODORO" && new V({
    title: e.title,
    body: e.text
  }).show();
}, () => {
  o == null || o.webContents.send("reminders:changed");
});
async function Ye() {
  try {
    await l.whenReady(), oe(), console.log("[main] schema init ok"), i.on("window:minimize", (n) => {
      const t = E.fromWebContents(n.sender);
      t == null || t.minimize();
    }), i.on("window:toggle-maximize", (n) => {
      const t = E.fromWebContents(n.sender);
      t && (t.isMaximized() ? t.unmaximize() : t.maximize());
    }), i.on("window:close", (n) => {
      const t = E.fromWebContents(n.sender);
      t == null || t.close();
    }), i.on("app:save-done", () => {
      N = !0, o == null || o.close();
    }), i.handle("shortcut:update", (n, t) => L(t)), i.handle("shortcut:get", () => R), i.on("quick:note:update", (n, t) => {
      _e(t);
    }), i.on("quick:note:close", () => {
      he();
    }), i.handle("notes:getAll", async () => Re()), i.handle("notes:upsert", async (n, t) => k(t)), i.handle("notes:delete", async (n, t) => Se(t)), i.handle("notes:create", async () => De()), i.handle("reminders:getAll", async () => Ie()), i.handle("reminders:upsert", async (n, t) => q(t)), i.handle("reminders:delete", async (n, t) => we(t)), i.handle("reminder:create", async () => Oe()), i.handle(
      "reminders:markTriggered",
      async (n, t, a) => Le(t, a)
    );
    const e = Pe();
    i.handle("pomodoro-finished", () => (e !== null && o && !o.isDestroyed() && (o == null || o.webContents.send("pomodoro-closed", e)), W(), !0)), i.handle("pomodoro-start", (n, t) => (Ue(t), o == null || o.webContents.send("reminders:changed"), !0)), i.handle("pomodoro-stop", () => (W(), !0)), i.handle("settings-open", () => (Fe(), !0)), i.handle("settings-close", () => (Ce(), !0)), i.handle("settings-save", (n, t) => (y = { ...t }, $e(y), L(y.shortCut), o == null || o.webContents.send("settings-changed", t), !0)), i.handle("settings-get", () => y), i.handle("app:set-auto-launch", (n, t) => (l.setLoginItemSettings({
      openAtLogin: t,
      args: t ? ["--hidden"] : []
    }), !0)), i.handle("app:get-auto-launch", () => l.getLoginItemSettings().openAtLogin), i.handle("shortcut:stop", () => (_.unregisterAll(), !0)), i.handle("shortcut:resume", () => (R && L(R), !0)), X.setApplicationMenu(null), l.requestSingleInstanceLock() ? (l.on("second-instance", () => {
      o && (o.isMinimized() && o.restore(), o.isVisible() || o.show(), o.focus());
    }), l.whenReady().then(H)) : l.quit(), L(y.shortCut), ze(), K.start(), l.on("activate", () => {
      E.getAllWindows().length === 0 && H();
    });
  } catch (e) {
    console.error("[main] bootstrap failed:", e), l.quit();
  }
}
Ye();
l.on("window-all-closed", () => {
  process.platform !== "darwin" && (l.quit(), o = null);
});
l.on("before-quit", () => {
  N = !0;
});
l.on("will-quit", () => {
  K.stop(), _.unregisterAll();
});
export {
  Ke as MAIN_DIST,
  U as RENDERER_DIST,
  D as VITE_DEV_SERVER_URL
};
