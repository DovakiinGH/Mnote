import { app as s, screen as w, BrowserWindow as g, globalShortcut as D, ipcMain as a, Notification as b, Menu as _, nativeImage as k, Tray as C } from "electron";
import { fileURLToPath as $ } from "node:url";
import { randomUUID as j } from "crypto";
import l from "node:path";
import Y from "better-sqlite3";
import I from "node:fs";
function H() {
  const e = s.isPackaged ? s.getPath("userData") : process.cwd();
  return I.existsSync(e) || I.mkdirSync(e, { recursive: !0 }), l.join(e, "mnote.db");
}
const U = H();
console.log("[db] SQLite path:", U);
const u = new Y(U);
u.pragma("journal_mode = WAL");
function B() {
  u.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      updatedAt INTEGER,
      createAt INTEGER,
      pinned INTEGER NOT NULL DEFAULT 0
    )
  `), u.exec(`
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
  `), u.exec("CREATE INDEX IF NOT EXISTS idx_reminders_enabled ON reminders(enabled)"), u.exec("CREATE INDEX IF NOT EXISTS idx_reminders_updatedAt ON reminders(updatedAt)"), console.log("[schema] SQLite tables ready");
}
function X() {
  return u.prepare(`
    SELECT * FROM reminders ORDER BY updatedAt DESC
  `).all();
}
function G(e) {
  const n = Date.now();
  return u.prepare(`
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
    e.createAt ?? n,
    e.updatedAt ?? n,
    e.lastTriggeredAt ?? null
  ), !0;
}
function V(e) {
  return u.prepare("DELETE FROM reminders WHERE id = ?").run(e), !0;
}
function W() {
  return u.prepare(`
    SELECT * FROM reminders WHERE enabled = 1
  `).all();
}
function x(e, n) {
  u.prepare(
    "UPDATE reminders SET lastTriggeredAt = ?, updatedAt = ? WHERE id = ?"
  ).run(n, n, e);
}
function z(e, n) {
  u.prepare(
    "UPDATE reminders SET enabled = 0, updatedAt = ? WHERE id = ?"
  ).run(n, e);
}
function Q(e) {
  if (!e) return null;
  if (typeof e == "string") return e.slice(0, 10);
  const n = e.getFullYear(), t = String(e.getMonth() + 1).padStart(2, "0"), i = String(e.getDate()).padStart(2, "0");
  return `${n}-${t}-${i}`;
}
function v(e) {
  return e ? e.length === 5 ? `${e}:00` : e : "00:00:00";
}
function q(e, n) {
  const t = Q(e);
  if (!t) return null;
  const i = v(n), c = (/* @__PURE__ */ new Date(`${t}T${i}`)).getTime();
  return Number.isNaN(c) ? null : c;
}
function K(e) {
  if (e.type === "AFTER_MINUTES") {
    const T = e.minutes ?? 1;
    return (e.updatedAt ?? e.createAt) + T * 60 * 1e3;
  }
  if (e.type === "DATE_TIME")
    return q(e.date, e.time);
  const n = e.days ?? 1, t = e.lastTriggeredAt ?? e.updatedAt ?? e.createAt, i = new Date(t);
  i.setDate(i.getDate() + n);
  const c = `${i.getFullYear()}-${String(i.getMonth() + 1).padStart(2, "0")}-${String(i.getDate()).padStart(2, "0")}`, o = v(e.time), m = (/* @__PURE__ */ new Date(`${c}T${o}`)).getTime();
  return Number.isNaN(m) ? null : m;
}
function J(e, n) {
  const t = K(e);
  return !(!t || n < t || e.lastTriggeredAt && e.lastTriggeredAt >= t);
}
function Z(e, n) {
  let t = null, i = !1;
  const c = async () => {
    if (!i) {
      i = !0;
      try {
        const o = Date.now(), m = await W();
        let T = !1;
        for (const E of m)
          J(E, o) && (await e({
            title: E.title || "M Note",
            text: E.text || "",
            mode: E.mode
          }), await x(E.id, o), (E.type === "AFTER_MINUTES" || E.type === "DATE_TIME") && await z(E.id, o), T = !0);
        T && n && n();
      } catch (o) {
        console.error("[scheduler.tick] failed:", o);
      } finally {
        i = !1;
      }
    }
  };
  return {
    start() {
      t || (c(), t = setInterval(() => {
        c();
      }, 5e3));
    },
    stop() {
      t && (clearInterval(t), t = null);
    }
  };
}
let d = null;
function ee(e, n, t, i) {
  const { width: c, height: o } = w.getPrimaryDisplay().workAreaSize;
  if (d && !d.isDestroyed()) {
    d.show(), d.focus();
    return;
  }
  let m = !1;
  d = new g({
    width: Math.round(c * 0.45),
    height: Math.round(o * 0.55),
    show: !1,
    alwaysOnTop: !0,
    autoHideMenuBar: !0,
    webPreferences: {
      preload: l.join(t, "preload.mjs")
    }
  }), e ? d.loadURL(`${e}#/quick`) : d.loadFile(l.join(n, "index.html"), { hash: "/quick" }), d.once("ready-to-show", () => {
    d == null || d.show(), d == null || d.focus();
  }), d.on("close", (T) => {
    m || (T.preventDefault(), Promise.resolve(i == null ? void 0 : i()).finally(() => {
      m = !0, d == null || d.close();
    }));
  }), d.on("closed", () => {
    d = null;
  });
}
function te(e) {
  const { id: n, title: t, content: i, updatedAt: c, createAt: o, pinned: m } = e;
  return u.prepare(`
    INSERT INTO notes (id, title, content, updatedAt, createAt, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updatedAt = excluded.updatedAt,
      createAt = excluded.createAt,
      pinned = excluded.pinned
  `).run(n, t, i, c ?? null, o ?? null, m ? 1 : 0), !0;
}
function ne() {
  return u.prepare(
    "SELECT id, title, content, createAt, updatedAt, pinned FROM notes ORDER BY pinned DESC, updatedAt DESC"
  ).all();
}
function re(e) {
  return u.prepare("DELETE FROM notes WHERE id = ?").run(e), !0;
}
function ie() {
  return ne();
}
function S(e) {
  const n = Date.now();
  return te({
    ...e,
    title: (e.title ?? "").trim() || "Untitled",
    content: e.content ?? "",
    createAt: e.createAt ?? n,
    updatedAt: e.updatedAt ?? n,
    pinned: e.pinned ?? 0
  }), !0;
}
function oe(e) {
  return re(e), !0;
}
function de() {
  const e = Date.now(), t = {
    id: e,
    title: "new",
    content: "",
    createAt: e,
    updatedAt: e,
    pinned: 0
  };
  return S(t), t;
}
function ae(e) {
  return e.type === "AFTER_MINUTES" ? { minutes: e.minutes ?? 1, date: null, time: null, days: null } : e.type === "DATE_TIME" ? { minutes: null, date: e.date ?? null, time: e.time ?? null, days: null } : { minutes: null, date: null, time: e.time ?? null, days: e.days ?? 1 };
}
function se() {
  return X();
}
function M(e) {
  const n = Date.now(), t = ae(e);
  return G({
    ...e,
    ...t,
    title: (e.title ?? "").trim() || "Untitled",
    text: e.text ?? "",
    enabled: e.enabled ? 1 : 0,
    pinned: e.pinned ?? 0,
    createAt: e.createAt ?? n,
    updatedAt: e.updatedAt ?? n
  }), !0;
}
function le(e) {
  return V(e), !0;
}
function ce(e, n = Date.now()) {
  return x(e, n), !0;
}
function ue() {
  const e = Date.now(), t = {
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
  return M(t), t;
}
let h = { title: "", content: "" };
function me(e) {
  h = {
    title: (e == null ? void 0 : e.title) ?? "",
    content: (e == null ? void 0 : e.content) ?? ""
  };
}
function Te() {
  h = { title: "", content: "" };
}
async function Ee(e) {
  var o;
  const n = ((o = h.title) == null ? void 0 : o.trim()) ?? "", t = h.content ?? "";
  if (!n && !t) return;
  const i = Date.now();
  await S({
    id: i,
    title: n || "Untitled",
    content: t,
    createAt: i,
    updatedAt: i,
    pinned: 0
  }), e == null || e.webContents.send("notes:changed"), Te();
}
console.log("[main] main.ts loaded");
const N = l.dirname($(import.meta.url));
process.env.APP_ROOT = l.join(N, "..");
const p = process.env.VITE_DEV_SERVER_URL, Ie = l.join(process.env.APP_ROOT, "dist-electron"), R = l.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = p ? l.join(process.env.APP_ROOT, "public") : R;
let r = null, f = !1, A = null, y = "Alt+Space";
const P = Z(
  async (e) => {
    e.mode === "NOTIFICATION" ? new b({
      title: e.title,
      body: e.text
    }).show() : e.mode === "POPUP_WINDOW" && F(e.text);
  },
  () => {
    r == null || r.webContents.send("reminders:changed");
  }
);
process.platform === "win32" && s.setAppUserModelId("com.yourapp.mnote");
function L() {
  r = new g({
    icon: l.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    title: "MNote",
    webPreferences: {
      preload: l.join(N, "preload.mjs")
    }
  }), r.on("close", (e) => {
    f || (e.preventDefault(), r == null || r.hide());
  }), r.webContents.on("did-finish-load", () => {
    r == null || r.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), p ? r.loadURL(`${p}#/`) : r.loadFile(l.join(R, "index.html"), { hash: "/" });
}
function pe(e) {
  return s.isPackaged ? l.join(process.resourcesPath, e) : l.join(process.cwd(), "resources", e);
}
function fe() {
  r == null || r.webContents.send("app:save-before-close"), setTimeout(() => {
    f || (f = !0, s.quit());
  }, 1e4);
}
function Ae() {
  const e = pe("tray.ico"), n = k.createFromPath(e);
  A = new C(n), A.setToolTip("MNote");
  const t = _.buildFromTemplate([
    {
      label: "Main Window",
      click: () => {
        r && (r.show(), r.focus());
      }
    },
    {
      label: "Exit",
      click: () => {
        fe();
      }
    }
  ]);
  A.setContextMenu(t), A.on("click", () => {
    r && (r.isVisible() ? r.hide() : (r.show(), r.focus()));
  });
}
function O(e) {
  return D.unregisterAll(), D.register(e, () => {
    console.log("[main] hotkey triggered:", e), ee(p, R, N, () => Ee(r));
  }) ? (y = e, !0) : !1;
}
function F(e) {
  const n = `reminder:submit-mandatory:${j()}`, { width: t, height: i } = w.getPrimaryDisplay().workAreaSize, c = !!r && !r.isDestroyed(), o = new g({
    width: Math.round(t * 0.6),
    height: Math.round(i * 0.65),
    ...c ? { parent: r, modal: !0 } : {},
    center: !0,
    resizable: !1,
    minimizable: !1,
    maximizable: !1,
    alwaysOnTop: !0,
    skipTaskbar: !1,
    autoHideMenuBar: !0,
    webPreferences: {
      preload: l.join(N, "preload.mjs")
    }
  });
  o.show(), o.focus(), p ? o.loadURL(
    `${p}#/reminder-mandatory?text=${encodeURIComponent(e)}&channel=${n}`
  ) : o.loadFile(l.join(R, "index.html"), {
    hash: `/reminder-mandatory?text=${encodeURIComponent(e)}&channel=${n}`
  });
  let m = !1;
  o.on("close", (T) => {
    m || T.preventDefault();
  }), a.handleOnce(n, async (T, E) => (m = !0, o.close(), a.removeHandler(n), !0));
}
async function he() {
  try {
    await s.whenReady(), console.log("[env] DB_HOST:", process.env.DB_HOST), console.log("[env] DB_USER:", process.env.DB_USER), console.log("[env] DB_PASSWORD:", process.env.DB_PASSWORD ? "***有值***" : "***空***"), console.log("[env] DB_NAME:", process.env.DB_NAME), B(), console.log("[main] schema init ok"), a.on("app:save-done", () => {
      f = !0, r == null || r.close();
    }), a.handle("shortcut:update", (n, t) => O(t)), a.handle("shortcut:get", () => y), a.on("quick:note:update", (n, t) => {
      me(t);
    }), a.handle("reminder:show", (n, t) => (new b({
      title: t.title || "Reminder",
      body: t.body || ""
    }).show(), !0)), a.handle("reminder:open-mandatory", (n, t) => (F(t || ""), !0)), a.handle("notes:getAll", async () => ie()), a.handle("notes:upsert", async (n, t) => S(t)), a.handle("notes:delete", async (n, t) => oe(t)), a.handle("notes:create", async () => de()), a.handle("reminders:getAll", async () => se()), a.handle("reminders:upsert", async (n, t) => M(t)), a.handle("reminders:delete", async (n, t) => le(t)), a.handle("reminder:create", async () => ue()), a.handle(
      "reminders:markTriggered",
      async (n, t, i) => ce(t, i)
    ), _.setApplicationMenu(null), s.requestSingleInstanceLock() ? (s.on("second-instance", () => {
      r && (r.isMinimized() && r.restore(), r.isVisible() || r.show(), r.focus());
    }), s.whenReady().then(L)) : s.quit(), O(y), Ae(), P.start(), s.on("activate", () => {
      g.getAllWindows().length === 0 && L();
    });
  } catch (e) {
    console.error("[main] bootstrap failed:", e), s.quit();
  }
}
he();
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), r = null);
});
s.on("before-quit", () => {
  f = !0;
});
s.on("will-quit", () => {
  P.stop(), D.unregisterAll();
});
export {
  Ie as MAIN_DIST,
  R as RENDERER_DIST,
  p as VITE_DEV_SERVER_URL
};
