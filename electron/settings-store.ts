import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const defaultSettings = {
  language: 'en-US',
  closeAction: 'tray'
}

export type AppSettings = typeof defaultSettings

const filePath = path.join(app.getPath('userData'), 'settings.json')

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
  } catch (e) {
    console.error('[settings] save failed:', e)
  }
}