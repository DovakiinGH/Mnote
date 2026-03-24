import { app, BrowserWindow,ipcMain,Menu,Tray,nativeImage,globalShortcut, Notification,screen  } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'crypto'
import path from 'node:path'
import { initSchema } from './backend/schema'
import { createReminderScheduler } from './reminder/scheduler'
import { openQuickWindow } from './quickWindow'

import { listNotesService,saveNoteService,removeNoteService,createNoteService } from './backend/notes.service'
import { listRemindersService, saveReminderService, removeReminderService, markReminderTriggeredService,createReminderService} from './backend/reminders.service' // 你文件名按实际改
import { updateQuickNote, saveQuickNote } from './backend/quick.service'
console.log('[main] main.ts loaded')
// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let isQuitting = false
let tray: Tray | null = null
let currentShortcut = 'Alt+Space'

const scheduler = createReminderScheduler(async (payload) => {
  if (payload.mode === 'NOTIFICATION') {
    // 系统通知
    const n = new Notification({
      title: payload.title,
      body: payload.text
    })
    n.show()
  } else if (payload.mode === 'POPUP_WINDOW'){
    // 弹窗
    openReminderMandatoryWindow(payload.text)
  }
},
  () => { win?.webContents.send('reminders:changed')}
)

// for windows system
if (process.platform === 'win32') {
  app.setAppUserModelId('com.yourapp.mnote')
}

//win
//---------------------------------------life cycle----------------------------------------------------------------------//


function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
     title: 'MNote',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
//   if (!app.isPackaged) {
//   win.webContents.openDevTools()
// }
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
       win?.hide()
      // win?.webContents.send('app:save-before-close')
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  
//URL
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#/`)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: '/' })
  }
}

//-------------------------------------tray----------------------------------------------------------------------------
function resolveResourcePath(fileName: string) {
  if (app.isPackaged) {
    // 打包后：资源在 process.resourcesPath
    return path.join(process.resourcesPath, fileName)
  }
  // 开发时：项目根目录/resources
  return path.join(process.cwd(), 'resources', fileName)
}
function requestQuitWithSave() {
  win?.webContents.send('app:save-before-close')
   setTimeout(() => {
    if (!isQuitting) {
      isQuitting = true
      app.quit()
    }
  }, 10000)
}

function createTray() {
  const trayIconPath = resolveResourcePath('tray.ico')
  const trayIcon = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(trayIcon)
  tray.setToolTip('MNote')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Main Window',
      click: () => {
        if (!win) return
        win.show()
        win.focus()
      }
    },
    {
      label: 'Exit',
      click: () => {
      requestQuitWithSave()
    }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (!win) return
    if (win.isVisible()) win.hide()
    else {
      win.show()
      win.focus()
    }
  })
}
//------------------------------------------short cut----------------------------------------------------------
function registerHotkey(accelerator: string) {
  globalShortcut.unregisterAll()
  const ok = globalShortcut.register(accelerator, () => {
    console.log('[main] hotkey triggered:', accelerator)
    openQuickWindow(VITE_DEV_SERVER_URL, RENDERER_DIST, __dirname,() => saveQuickNote(win))
  })
  if (!ok) return false
  currentShortcut = accelerator
  return true
}
//------------------------------------pop windows------------------------------------------------
function openReminderMandatoryWindow(initialText: string) {
  const channel = `reminder:submit-mandatory:${randomUUID()}`

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const hasParent = !!win && !win.isDestroyed()
  const popup = new BrowserWindow({
    width: Math.round(screenW * 0.6),  
    height: Math.round(screenH * 0.65), 
    ...(hasParent ? { parent: win!, modal: true } : {}), 
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false, 
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  })
  popup.show()
  popup.focus()
  if (VITE_DEV_SERVER_URL) {
    popup.loadURL(
      `${VITE_DEV_SERVER_URL}#/reminder-mandatory?text=${encodeURIComponent(initialText)}&channel=${channel}`
    )
  } else {
    popup.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: `/reminder-mandatory?text=${encodeURIComponent(initialText)}&channel=${channel}`
    })
  }
  let handled = false
  popup.on('close', (event) => {
    if (!handled) event.preventDefault()
  })

  ipcMain.handleOnce(channel, async (_event, _payload: { text: string }) => {
    handled = true
    popup.close()
    ipcMain.removeHandler(channel)
    return true
  })

}
 
//-----------------------------------------start-------------------------------------------------
async function bootstrap() {
  try {
    await app.whenReady()

    console.log('[env] DB_HOST:', process.env.DB_HOST)
    console.log('[env] DB_USER:', process.env.DB_USER)
    console.log('[env] DB_PASSWORD:', process.env.DB_PASSWORD ? '***有值***' : '***空***')
    console.log('[env] DB_NAME:', process.env.DB_NAME)

    initSchema()
    console.log('[main] schema init ok')

    //------------------ipc-------------------------------------------//

    ipcMain.on('app:save-done', () => {
      isQuitting = true
      win?.close()
    })
    ipcMain.handle('shortcut:update', (_event, accelerator: string) => {
      return registerHotkey(accelerator)
    })
    ipcMain.handle('shortcut:get', () => currentShortcut)
    ipcMain.on('quick:note:update', (_event, note: { title: string; content: string }) => {
      updateQuickNote(note)
    })
    ipcMain.handle('reminder:show', (_event, payload: { title: string; body: string }) => {
      const n = new Notification({
        title: payload.title || 'Reminder',
        body: payload.body || ''
      })
      n.show()
      return true
    })
    ipcMain.handle('reminder:open-mandatory', (_e, text: string) => {
      openReminderMandatoryWindow(text || '')
      return true
    })
     
    ipcMain.handle('notes:getAll', async () => listNotesService())
    ipcMain.handle('notes:upsert', async (_e, payload) => saveNoteService(payload))
    ipcMain.handle('notes:delete', async (_e, id: number) => removeNoteService(id))
    ipcMain.handle('notes:create', async () => createNoteService())

    ipcMain.handle('reminders:getAll', async () => listRemindersService())
    ipcMain.handle('reminders:upsert', async (_e, payload) => saveReminderService(payload))
    ipcMain.handle('reminders:delete', async (_e, id: number) => removeReminderService(id))
    ipcMain.handle('reminder:create', async () => createReminderService())
    ipcMain.handle('reminders:markTriggered', async (_e, id: number, ts?: number) =>
      markReminderTriggeredService(id, ts)
    )

    //---------------------------------------------------------------//

    Menu.setApplicationMenu(null)
    const gotTheLock = app.requestSingleInstanceLock()

    if (!gotTheLock) {
      app.quit()
    } else {
      app.on('second-instance', () => {
        if (win) {
          if (win.isMinimized()) win.restore()
          if (!win.isVisible()) win.show()
          win.focus()
        }
      })
      app.whenReady().then(createWindow)
    }

    
    registerHotkey(currentShortcut)
    createTray()
    scheduler.start() //FOR REMINDERS

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    console.error('[main] bootstrap failed:', err)
    app.quit()
  }
}

bootstrap()
//------------------------------------quit------------------------------------------------------
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})
app.on('before-quit', () => {
  isQuitting = true
})
app.on('will-quit', () => {
  scheduler.stop() //FOR REMINDERS
  globalShortcut.unregisterAll()
})
