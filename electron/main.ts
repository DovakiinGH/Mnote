import { app, BrowserWindow,ipcMain,Menu  } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initSchema } from './backend/schema'
import { getAllNotes, upsertNote, deleteNote } from './backend/notes'

console.log('[main] main.ts loaded')
const require = createRequire(import.meta.url)
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

let win: BrowserWindow | null
let isQuitting = false



//---------------------------------------life cycle----------------------------------------------------------------------//
app.on('before-quit', () => {
  isQuitting = true
})

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win?.webContents.send('app:save-before-close')
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}



async function bootstrap() {
  try {
    await app.whenReady()

    // 先初始化数据库（建库 + 建表）
    await initSchema()
    console.log('[main] schema init ok')

    //------------------ipc-------------------------------------------//
    ipcMain.handle('notes:getAll', async () => {
      return await getAllNotes()
    })

    ipcMain.handle('notes:upsert', async (_event, note) => {
      return await upsertNote(note)
    })

    ipcMain.handle('notes:delete', async (_event, id: number) => {
      return await deleteNote(id)
    })

    ipcMain.on('app:save-done', () => {
      isQuitting = true
      win?.close()
    })
    //---------------------------------------------------------------//

    Menu.setApplicationMenu(null)

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    console.error('[main] bootstrap failed:', err)
    app.quit()
  }
}

bootstrap()

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

// app.on('activate', () => {
//   // On OS X it's common to re-create a window in the app when the
//   // dock icon is clicked and there are no other windows open.
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow()
//   }
// })

// app.whenReady().then(async () => {
//   await initSchema()
//   createWindow()
// })

// Menu.setApplicationMenu(null) // 移除系统菜单