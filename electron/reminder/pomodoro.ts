import { BrowserWindow,screen  } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getResourcePath } from '../path'
import {
  markTriggered,
} from '../backend/reminders.repo'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let pomodoroWin: BrowserWindow | null = null
let currentReminderId: number | null = null

let mainWin: BrowserWindow | null = null

export function initPomodoro(win: BrowserWindow | null) {
  mainWin = win
}

export function openPomodoroWindow(data: {
  id: number
  title: string
  text: string
  minutes: number
}) {
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    if (currentReminderId !== null && mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('pomodoro-closed', currentReminderId)
    }
    pomodoroWin.destroy()
    pomodoroWin = null
  }

  currentReminderId = data.id
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  pomodoroWin = new BrowserWindow({
   width: Math.round(screenW * 0.25),
    height: Math.round(screenH * 0.35),
    resizable: true,
    alwaysOnTop: true,
    frame: false,
    icon: getResourcePath('icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  markTriggered(data.id, Date.now())

  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro`)
  } else {
    pomodoroWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/pomodoro'
    })
  }

const params = encodeURIComponent(JSON.stringify({
  title: data.title,
  text: data.text,
  minutes: data.minutes
}))

  if (process.env.VITE_DEV_SERVER_URL) {
    pomodoroWin.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/pomodoro?data=${params}`)
  } else {
    pomodoroWin.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: `/pomodoro?data=${params}`
    })
  }

  pomodoroWin.on('closed', () => {
      if (currentReminderId !== null && mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('pomodoro-closed', currentReminderId)
    }
    pomodoroWin = null
    currentReminderId = null
  })
}

export function closePomodoroWindow() {
  if (pomodoroWin && !pomodoroWin.isDestroyed()) {
    const win = pomodoroWin
    pomodoroWin = null
    currentReminderId = null
    win.destroy()
  }
}

export function getCurrentPomodoroId(): number | null {
  return currentReminderId
}

