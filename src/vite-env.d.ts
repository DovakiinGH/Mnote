/// <reference types="vite/client" />
interface Window {
  db: {
    query: (sql: string, params?: any[]) => Promise<any>
  }
}