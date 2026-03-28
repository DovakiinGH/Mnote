import { BrowserWindow, ipcMain,screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getResourcePath } from './path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let settingsWin: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null

// function getMainWindow(): BrowserWindow | null {
//   const allWindows = BrowserWindow.getAllWindows()
//   return allWindows.find(w => w !== settingsWin && !w.isDestroyed()) ?? null
// }
export function initSettings(win: BrowserWindow | null) {
  mainWin = win
}
export function openSettingsWindow(){
    if (settingsWin && !settingsWin.isDestroyed()) {
        settingsWin.focus()
        return
    }
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    // const mainWin = getMainWindow()
    settingsWin = new BrowserWindow({
        width: Math.round(screenW * 0.45),  
        height: Math.round(screenH * 0.55),
        resizable: false,
        modal: true,
        alwaysOnTop: true,
        center: true,
        parent: mainWin ?? undefined,
        icon: getResourcePath('icon.ico'),
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            },
        })
    if (process.env.VITE_DEV_SERVER_URL) {
        settingsWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/settings`)
    } else {
        settingsWin.loadFile(path.join(__dirname, '../dist/index.html'), {
        hash: '/settings'
        })
    }
    settingsWin.on('closed', () => {
    settingsWin = null
  })
}
export function closeSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.destroy()
    settingsWin = null
  }
}
export function setupSettingsIpc() {
  ipcMain.handle('settings-open', () => {openSettingsWindow()
    return true
  })
  ipcMain.handle('settings-close', () => {closeSettingsWindow()
    return true
  })
  ipcMain.handle('settings-save', (_event, settings: {
    language: string
    closeAction: string
  }) => {
    mainWin?.webContents.send('settings-changed', settings)
    return true
  })
}
