import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const defaultSettings = {
  language: 'en-US',
  closeAction: 'tray',
  autoLaunch: false,
  shortCut: 'Ctrl+Space'
}

export type AppSettings = typeof defaultSettings

const filePath = path.join(app.getPath('userData'), 'settings.json')
//%APPDATA%\Mnote
export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return { ...defaultSettings, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.error('[settings] load failed:', e)
  }
  return { ...defaultSettings }
}

export function saveSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')  
    // null for do not use replacer, 2 for pretty-printing(2 spaces at the beginning of each line)
  } catch (e) {
    console.error('[settings] save failed:', e)
  }
}