import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

export interface AppConfig {
  DB_HOST: string
  DB_PORT: number
  DB_USER: string
  DB_PASSWORD: string
  DB_NAME: string
}

const defaultConfig: AppConfig = {
  DB_HOST: 'localhost',
  DB_PORT: 3306,
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: 'mnote'
}

// 配置文件路径：
// 开发时：项目根目录/config.json
// 打包后：exe 旁边的 config.json
function getConfigPath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'config.json')
  }
  return path.join(process.cwd(), 'config.json')
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath()

  if (!fs.existsSync(configPath)) {
    // 配置文件不存在，创建一个默认的
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')
    console.log('[config] created default config at:', configPath)
    return { ...defaultConfig }
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const json = JSON.parse(raw)
    console.log('[config] loaded from:', configPath)
    return {
      DB_HOST: json.DB_HOST ?? defaultConfig.DB_HOST,
      DB_PORT: Number(json.DB_PORT) || defaultConfig.DB_PORT,
      DB_USER: json.DB_USER ?? defaultConfig.DB_USER,
      DB_PASSWORD: json.DB_PASSWORD ?? defaultConfig.DB_PASSWORD,
      DB_NAME: json.DB_NAME ?? defaultConfig.DB_NAME,
    }
  } catch (e) {
    console.error('[config] failed to read config, using defaults:', e)
    return { ...defaultConfig }
  }
}