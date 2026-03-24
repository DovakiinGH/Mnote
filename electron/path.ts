import { app } from 'electron'
import path from 'node:path'

const isProd = app.isPackaged

export const getResourcePath = (fileName: string): string => {
  if (isProd) {
    return path.join(process.resourcesPath, fileName)
  }
  return path.join(process.cwd(), 'resources', fileName)
}