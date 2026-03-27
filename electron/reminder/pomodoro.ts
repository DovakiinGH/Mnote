import { BrowserWindow, ipcMain,screen } from 'electron'
import path from 'node:path'
import { getResourcePath } from '../path'
import { fileURLToPath } from 'node:url'
let pomodoroWin: BrowserWindow | null = null
let currentReminderId: number | null = null

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 关闭窗口时的回调
let onCloseCallback: ((id: number) => void) | null = null

export function setOnPomodoroClose(cb: (id: number) => void) {
  onCloseCallback = cb
}

export function openPomodoroWindow(data: {
  id: number
  title: string
  text: string
  minutes: number
}) {
  // 如果已有窗口，先关闭（单例）
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    // 通知前端旧的番茄钟被关闭
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId)
    }
    pomodoroWin.destroy()
    pomodoroWin = null
  }

  currentReminderId = data.id

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  pomodoroWin = new BrowserWindow({
    width: Math.round(screenW * 0.15),  
    height: Math.round(screenH * 0.25),
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    icon: getResourcePath('icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro`)
  } else {
    pomodoroWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/pomodoro'
    })
  }

  // 页面加载完后发送数据
  pomodoroWin.webContents.on('did-finish-load', () => {
    pomodoroWin?.webContents.send('pomodoro-init', {
      title: data.title,
      text: data.text,
      minutes: data.minutes
    })
  })

  // 窗口被用户关闭时
  pomodoroWin.on('closed', () => {
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId)
    }
    pomodoroWin = null
    currentReminderId = null
  })
}

export function closePomodoroWindow() {
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    // 不触发 onCloseCallback，因为是主动关闭
    const win = pomodoroWin
    pomodoroWin = null
    currentReminderId = null
    win.destroy()
  }
}

export function getCurrentPomodoroId(): number | null {
  return currentReminderId
}

export function setupPomodoroIpc() {
  // 番茄钟倒计时结束
  ipcMain.handle('pomodoro-finished', () => {
    if (currentReminderId !== null && onCloseCallback) {
      onCloseCallback(currentReminderId)
    }
    closePomodoroWindow()
    return true
  })
}