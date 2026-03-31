import { computed } from 'vue'
import type { Ref } from 'vue'
import type { ReminderItem, ReminderForm } from '../types/mainView'

export function useReminderForm(
  reminderStore: Ref<Record<number, ReminderForm>>,
  activeReminderItem: Ref<ReminderItem | null>,
  scheduleSaveReminder: (id: number) => void,
  saveReminder: (id: number) => Promise<void>
) {
  const currentReminderForm = computed<ReminderForm>(() => {
    const id = activeReminderItem.value?.id
    if (!id) {
      return { type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', minutes: 5, enabled: false }
    }

    if (!reminderStore.value[id]) {
      reminderStore.value[id] = {
        type: 'AFTER_MINUTES',
        mode: 'NOTIFICATION',
        text: '',
        minutes: 5,
        enabled: false
      }
    }
    return reminderStore.value[id]
  })

  const isReminderLocked = computed(() => currentReminderForm.value.enabled === true)

  const isReminderActive = (id: number): boolean => {
    return reminderStore.value[id]?.enabled === true
  }

  const disablePastDate = (time: Date) => {
    return time.getTime() < Date.now() - 8.64e7
  }

  const isToday = computed(() => {
    if (!currentReminderForm.value.date) return false
    const today = new Date().toISOString().slice(0, 10)
    return currentReminderForm.value.date === today
  })

  const disabledHours = () => {
    if (!isToday.value) return []
    const currentHour = new Date().getHours()
    return Array.from({ length: currentHour }, (_, i) => i)
  }

  const disabledMinutes = (hour: number) => {
    if (!isToday.value) return []
    const now = new Date()
    if (hour > now.getHours()) return []
    if (hour < now.getHours()) return Array.from({ length: 60 }, (_, i) => i)
    return Array.from({ length: now.getMinutes() }, (_, i) => i)
  }

  const onModeChange = (mode: string) => {
    if (mode === 'POMODORO') {
      currentReminderForm.value.type = 'AFTER_MINUTES'
      if (!currentReminderForm.value.minutes || currentReminderForm.value.minutes < 1) {
        currentReminderForm.value.minutes = 25
      }
    }
  }

  const onEnabledChange = async (val: boolean) => {
    const item = activeReminderItem.value
    if (!item) return

    const form = reminderStore.value[item.id]
    if (!form || form.mode !== 'POMODORO') return

    if (val) {
      for (const [idStr, f] of Object.entries(reminderStore.value)) {
        const otherId = Number(idStr)
        if (otherId !== item.id && f.mode === 'POMODORO' && f.enabled) {
          f.enabled = false
          saveReminder(otherId)
        }
      }
      saveReminder(item.id)
      await window.api.pomodoroStart({
        id: item.id,
        title: item.name,
        text: form.text ?? '',
        minutes: form.minutes ?? 25
      })
    } else {
      await window.api.pomodoroStop()
    }
  }

  return {
    currentReminderForm,
    isReminderLocked,
    isReminderActive,
    disablePastDate,
    disabledHours,
    disabledMinutes,
    onModeChange,
    onEnabledChange
  }
}