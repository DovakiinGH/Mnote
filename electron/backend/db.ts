import mysql from 'mysql2/promise'
import { loadConfig } from './config'

const config = loadConfig()

console.log('[db] connecting to:', config.DB_HOST, config.DB_PORT, config.DB_NAME)

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME
})