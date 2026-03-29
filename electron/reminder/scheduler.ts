import { getEnabledReminders, markTriggered, disableReminder,ReminderMode } from "../backend/reminders.repo"
import { isDue } from './timeCalc'
type NotifyPayload = {
  title: string
  text: string
  mode: ReminderMode
}

type NotifyFn = (payload: NotifyPayload) => Promise<void> | void
// can be async or not

//FACTORY FUNCTION
export function createReminderScheduler(notify: NotifyFn,onChanged?: () => void) {
//notify is the function that send the notification, window..... 
  let timer: ReturnType<typeof setInterval> | null = null
  let running = false

  const tick = async () => {
    //prevent the situation that other tick is running
    if (running) return
    running = true

    try {
      const now = Date.now()
      const rows = getEnabledReminders()
      let changed = false  

      //every reminder that enable(start)
      for (const row of rows) {
        // not time up
        if (!isDue(row, now)) continue

        //time's up; here give the function input 
        await notify({
          title: row.title || 'M Note',
          text: row.text || '',
          mode: row.mode
        })

        markTriggered(row.id, now)

        // one time reminder -> close it
        if (row.type === 'AFTER_MINUTES' || row.type === 'DATE_TIME') {
          disableReminder(row.id, now)
        }
        changed = true
      }
      if (changed && onChanged) {
        onChanged()
      }
    } catch (err) {
      console.error('[scheduler.tick] failed:', err)
    } finally {
      running = false
    }
  }

  return {
    start() {
      if (timer) return
      void tick() //run once at first
      timer = setInterval(() => { 
        void tick()
      }, 5_000)
    },
    stop() {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }
  }
}