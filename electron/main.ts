import { app, BrowserWindow,ipcMain,Menu,Tray,nativeImage,globalShortcut, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initSchema } from './backend/schema'
import { createReminderScheduler } from './reminder/scheduler'
import { openQuickWindow,closeQuickWindow } from './quickWindow'

import { listNotesService,saveNoteService,removeNoteService,createNoteService } from './backend/notes.service'
import { listRemindersService, saveReminderService, removeReminderService, markReminderTriggeredService,createReminderService} from './backend/reminders.service' 
import { updateQuickNote, saveQuickNote } from './backend/quick.service'
import { getResourcePath } from './path'
import {openPomodoroWindow,closePomodoroWindow,initPomodoro,getCurrentPomodoroId} from './reminder/pomodoro'
import { initSettings,openSettingsWindow,closeSettingsWindow } from './settings'
import { loadSettings, saveSettings } from './settings-store'
import type { AppSettings } from './settings-store'
import { initReminderMandatoryWindow, openReminderMandatoryWindow } from './reminder/reminderMandatoryWindow'
console.log('[main] main.ts loaded')
// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
let currentSettings = loadSettings()



if (process.platform === 'win32') {
  app.setAppUserModelId('MNote')
}
app.setName('MNote')
//--------------------------------------createWindow----------------------------------------------------------------------//

function createWindow() {
  win = new BrowserWindow({
     icon: getResourcePath('icon.ico'),
     title: 'MNote',
      frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
//   if (!app.isPackaged) {
//   win.webContents.openDevTools()
// }
  win.on('close', (e) => {
    if (isQuitting) return
    if (currentSettings.closeAction === 'tray') {
      e.preventDefault()
      win?.hide()
    }else if (currentSettings.closeAction === 'quit') {
      e.preventDefault() 
      requestQuitWithSave()
    }
  })
   

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(`${VITE_DEV_SERVER_URL}#/`)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: '/' })
  }
  initSettings(win)
  initPomodoro(win)
  initReminderMandatoryWindow(win)

}

//-------------------------------------tray----------------------------------------------------------------------------
function resolveResourcePath(fileName: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, fileName)
  }
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
//------------------------------------reminders pop windows------------------------------------------------
const scheduler = createReminderScheduler(async (payload) => {
  if (payload.mode === 'NOTIFICATION') {
    const n = new Notification({
      title: payload.title,
      body: payload.text
    })
    n.show()
  } else if (payload.mode === 'POPUP_WINDOW'){
    openReminderMandatoryWindow(VITE_DEV_SERVER_URL, RENDERER_DIST, __dirname, payload.text)
  } else if (payload.mode === 'POMODORO') {
      const n = new Notification({
      title: payload.title,
      body: payload.text
    })
    n.show()
  }
}, () => { win?.webContents.send('reminders:changed') })


 
//-----------------------------------------start-------------------------------------------------
async function bootstrap() {
  try {
    await app.whenReady()
    initSchema()
    console.log('[main] schema init ok')
    //------------------ipc-------------------------------------------//
    ipcMain.on('window:minimize', (event) => {
      const w = BrowserWindow.fromWebContents(event.sender)
      w?.minimize()
    })
    ipcMain.on('window:toggle-maximize', (event) => {
      const w = BrowserWindow.fromWebContents(event.sender)
      if (!w) return
      if (w.isMaximized()) w.unmaximize()
      else w.maximize()
    })
    ipcMain.on('window:close', (event) => {
      const w = BrowserWindow.fromWebContents(event.sender)
      w?.close()
    })

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
    ipcMain.on('quick:note:close',()=>{
      closeQuickWindow()
    })
    // ipcMain.handle('reminder:show', (_event, payload: { title: string; body: string }) => {
    //   const n = new Notification({
    //     title: payload.title || 'Reminder',
    //     body: payload.body || ''
    //   })
    //   n.show()
    //   return true
    // })
    // ipcMain.handle('reminder:open-mandatory', (_e, text: string) => {
    //   openReminderMandatoryWindow(VITE_DEV_SERVER_URL, RENDERER_DIST, __dirname,text || '')
    //   return true
    // })
     
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
    // ---- pomodoro ipc ---- -----------------------------------//
    //a set up 'pomodoro-finished' from pomodoro.ts, 
    // which will be called when pomodoro window sends 'pomodoro-finished' after countdown ends
    const currentReminderId =getCurrentPomodoroId() 
    ipcMain.handle('pomodoro-finished', () => {
        if (currentReminderId !== null && win && !win.isDestroyed()) {
          win?.webContents.send('pomodoro-closed', currentReminderId)
        }
        closePomodoroWindow()
        return true
      })
    // from Pomodoro vue 
    ipcMain.handle('pomodoro-start', (_event, data: {id: number,title: string,text: string,minutes: number}) => {
      openPomodoroWindow(data)
      win?.webContents.send('reminders:changed')
      return true
    })
    ipcMain.handle('pomodoro-stop', () => {
      closePomodoroWindow()
      return true
    })
    //------------------settings ipc
    ipcMain.handle('settings-open', () => {openSettingsWindow()
      return true
    })
    ipcMain.handle('settings-close', () => {closeSettingsWindow()
      return true
    })
    ipcMain.handle('settings-save', (_event, settings: AppSettings) => {  
      currentSettings = { ...settings }                                    
      saveSettings(currentSettings)                                        
      win?.webContents.send('settings-changed', settings)                
      return true
    })

    ipcMain.handle('settings-get', () => {                               
      return currentSettings                                            
    }) 

    //---------------------------------------------------------------//
    //SingletInstance
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
