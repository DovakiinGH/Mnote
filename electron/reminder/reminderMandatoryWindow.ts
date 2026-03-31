import { BrowserWindow, ipcMain, screen } from 'electron'
import { randomUUID } from 'crypto'
import path from 'node:path'
import { getResourcePath } from '../path'

let mainWin: BrowserWindow | null = null
export function initReminderMandatoryWindow(win: BrowserWindow | null) {
    mainWin = win 
}  

export function openReminderMandatoryWindow
    (VITE_DEV_SERVER_URL: string | undefined, RENDERER_DIST: string, __dirname: string, initialText: string) 
  {
  const channel = `reminder:submit-mandatory:${randomUUID()}`

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const hasParent = !!mainWin && !mainWin.isDestroyed()
  const popup = new BrowserWindow({
    width: Math.round(screenW * 0.5),  
    height: Math.round(screenH * 0.55), 
    ...(hasParent ? { parent: mainWin!, modal: true } : {}), 
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: false, 
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    },
     icon: getResourcePath('icon.ico'),
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

  // Prevent closing the window without submitting
  let handled = false
  popup.on('close', (event) => {
    if (!handled) event.preventDefault()
  })
  // Handle for the random channel for just one time use when submit button is clicked in the mandatory reminder window,
  // then close the popup and remove the handler to avoid memory leak
  ipcMain.handleOnce(channel, async (_event, _payload: { text: string }) => {
    handled = true
    popup.close()
    ipcMain.removeHandler(channel)
    return true
  })

}