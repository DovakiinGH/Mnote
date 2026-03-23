import { BrowserWindow,screen } from 'electron'
import path from 'node:path'

let quickWin: BrowserWindow | null = null

export function openQuickWindow(
  VITE_DEV_SERVER_URL: string | undefined,
  RENDERER_DIST: string,
  __dirname: string,
  onBeforeClose?: () => Promise<void> | void
  //a function called onBeforeClose, can 同步 or 异步(return void or Promise<void>)
) {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  if (quickWin && !quickWin.isDestroyed()) {
    quickWin.show()
    quickWin.focus()
    return
  }
  let allowClose = false

  quickWin = new BrowserWindow({
    width: Math.round(screenW * 0.45),  
    height: Math.round(screenH * 0.55),
    show: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs')
    }
  })

  if (VITE_DEV_SERVER_URL) {
    quickWin.loadURL(`${VITE_DEV_SERVER_URL}#/quick`)
  } else {
    quickWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: '/quick' })
  }

  //-----------------------------------------life cycle--------------------------------------------------
  quickWin.once('ready-to-show', () => {
    quickWin?.show()
    quickWin?.focus()
  })

  quickWin.on('close', (e) => {
    if (allowClose) return
    e.preventDefault()

    Promise.resolve(onBeforeClose?.()).finally(() => {
      //Promise.resolve let the return of onBeforeClose() turn to promise whether it is promise or not
      //finally make sure the code below will execute
      allowClose = true
      quickWin?.close()
    })
  })

  quickWin.on('closed', () => {
    quickWin = null
  })
}