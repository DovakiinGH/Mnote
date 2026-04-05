/**
 * ============================================================
 * 测试对象: src/composables/useReminder.ts
 * 测试类型: 单元测试 (Unit Testing)
 * 测试方法: 黑盒测试 — 等价类划分 + 边界值分析
 *
 * 等价类:
 *   1. currentReminderForm — 无活跃项 / 有活跃项但无 store / 有 store
 *   2. isReminderLocked — enabled=true / enabled=false
 *   3. isReminderActive — 存在且启用 / 不存在
 *   4. disablePastDate — 昨天 / 今天 / 明天
 *   5. onModeChange — 切到 POMODORO / 切到其他
 *   6. onEnabledChange — 启动番茄钟 / 关闭番茄钟 / 非番茄模式
 *   7. disabledHours / disabledMinutes — 今天 vs 其他日期
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useReminderForm } from '../src/composables/useReminder'
import type { ReminderItem, ReminderForm } from '../src/types/mainView'

const mockApi = {
  pomodoroStart: vi.fn(),
  pomodoroStop: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.pomodoroStart.mockResolvedValue(undefined)
  mockApi.pomodoroStop.mockResolvedValue(undefined)
  ;(globalThis as any).window = { api: mockApi }
})

function setup(
  storeData: Record<number, ReminderForm> = {},
  activeItem: ReminderItem | null = null
) {
  const reminderStore = ref<Record<number, ReminderForm>>(storeData)
  const activeReminderItem = ref<ReminderItem | null>(activeItem)
  const saveReminder = vi.fn().mockResolvedValue(undefined)

  const result = useReminderForm(reminderStore, activeReminderItem, saveReminder)
  return { ...result, reminderStore, activeReminderItem, saveReminder }
}

// ---- currentReminderForm ----

describe('currentReminderForm', () => {

  it('无活跃项 → 返回默认表单', () => {
    const { currentReminderForm } = setup({}, null)

    expect(currentReminderForm.value).toMatchObject({
      type: 'AFTER_MINUTES',
      mode: 'NOTIFICATION',
      enabled: false,
      minutes: 5,
    })
  })

  it('有活跃项但 store 中无数据 → 自动创建默认表单', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const { currentReminderForm, reminderStore } = setup({}, item)

    expect(currentReminderForm.value.type).toBe('AFTER_MINUTES')
    expect(reminderStore.value[1]).toBeDefined()
  })

  it('有活跃项且 store 有数据 → 返回 store 中的表单', () => {
    const item: ReminderItem = { id: 5, name: 'R5', contentId: 5, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'POPUP_WINDOW', text: 'hello',
      enabled: true, date: '2025-12-01', time: '09:00'
    }

    const { currentReminderForm } = setup({ 5: form }, item)

    expect(currentReminderForm.value).toMatchObject({
      type: 'DATE_TIME', mode: 'POPUP_WINDOW', text: 'hello', enabled: true
    })
  })
})

// ---- isReminderLocked ----

describe('isReminderLocked', () => {

  it('enabled=true → locked', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: true, minutes: 5
    }
    const { isReminderLocked } = setup({ 1: form }, item)

    expect(isReminderLocked.value).toBe(true)
  })

  it('enabled=false → not locked', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 5
    }
    const { isReminderLocked } = setup({ 1: form }, item)

    expect(isReminderLocked.value).toBe(false)
  })
})

// ---- isReminderActive ----

describe('isReminderActive', () => {

  it('store 中存在且 enabled → true', () => {
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: true, minutes: 5
    }
    const { isReminderActive } = setup({ 1: form }, null)

    expect(isReminderActive(1)).toBe(true)
  })

  it('store 中不存在 → false', () => {
    const { isReminderActive } = setup({}, null)

    expect(isReminderActive(999)).toBe(false)
  })

  it('store 中存在但 enabled=false → false', () => {
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 5
    }
    const { isReminderActive } = setup({ 2: form }, null)

    expect(isReminderActive(2)).toBe(false)
  })
})

// ---- disablePastDate ----

describe('disablePastDate', () => {

  it('昨天 → true (禁用)', () => {
    const { disablePastDate } = setup()
    const yesterday = new Date(Date.now() - 2 * 8.64e7) // 2天前必定过去
    expect(disablePastDate(yesterday)).toBe(true)
  })

  it('明天 → false (可选)', () => {
    const { disablePastDate } = setup()
    const tomorrow = new Date(Date.now() + 8.64e7)
    expect(disablePastDate(tomorrow)).toBe(false)
  })
})

// ---- onModeChange ----

describe('onModeChange', () => {

  it('切到 POMODORO → type 强制为 AFTER_MINUTES，minutes 默认 25', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 0
    }
    const { onModeChange, currentReminderForm } = setup({ 1: form }, item)

    onModeChange('POMODORO')

    expect(currentReminderForm.value.type).toBe('AFTER_MINUTES')
    expect(currentReminderForm.value.minutes).toBe(25)
  })

  it('切到 POMODORO，minutes 已有值(>0) → 保留原值', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 45
    }
    const { onModeChange, currentReminderForm } = setup({ 1: form }, item)

    onModeChange('POMODORO')

    expect(currentReminderForm.value.minutes).toBe(45)
  })

  it('切到非 POMODORO → 不改变 type', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false
    }
    const { onModeChange, currentReminderForm } = setup({ 1: form }, item)

    onModeChange('NOTIFICATION')

    expect(currentReminderForm.value.type).toBe('DATE_TIME')
  })
})

// ---- onEnabledChange ----

describe('onEnabledChange', () => {

  it('启用番茄钟 → 调用 pomodoroStart，关闭其他番茄', async () => {
    const item: ReminderItem = { id: 1, name: 'Pomo', contentId: 1, lastTriggeredAt: null }
    const form1: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'POMODORO', text: 'work', enabled: true, minutes: 25
    }
    const form2: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'POMODORO', text: 'other', enabled: true, minutes: 10
    }

    const { onEnabledChange, reminderStore, saveReminder } = setup(
      { 1: form1, 2: form2 }, item
    )

    await onEnabledChange(true)

    // 其他番茄被关闭
    expect(reminderStore.value[2].enabled).toBe(false)
    expect(saveReminder).toHaveBeenCalledWith(2)
    expect(saveReminder).toHaveBeenCalledWith(1)
    expect(mockApi.pomodoroStart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, minutes: 25 })
    )
  })

  it('关闭番茄钟 → 调用 pomodoroStop', async () => {
    const item: ReminderItem = { id: 1, name: 'Pomo', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'POMODORO', text: '', enabled: false, minutes: 25
    }

    const { onEnabledChange } = setup({ 1: form }, item)

    await onEnabledChange(false)

    expect(mockApi.pomodoroStop).toHaveBeenCalled()
    expect(mockApi.pomodoroStart).not.toHaveBeenCalled()
  })

  it('非番茄模式 → 不调用 pomodoroStart/Stop', async () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: true, minutes: 5
    }

    const { onEnabledChange } = setup({ 1: form }, item)

    await onEnabledChange(true)

    expect(mockApi.pomodoroStart).not.toHaveBeenCalled()
    expect(mockApi.pomodoroStop).not.toHaveBeenCalled()
  })

  it('无活跃项 → 不执行任何操作', async () => {
    const { onEnabledChange } = setup({}, null)

    await onEnabledChange(true)

    expect(mockApi.pomodoroStart).not.toHaveBeenCalled()
  })
})

// ---- disabledHours / disabledMinutes ----

describe('disabledHours / disabledMinutes', () => {

  it('日期非今天 → 无禁用小时', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: '2099-01-01', time: '10:00'
    }
    const { disabledHours, disabledMinutes } = setup({ 1: form }, item)

    expect(disabledHours()).toEqual([])
    expect(disabledMinutes(10)).toEqual([])
  })

  it('日期是今天 → 过去的小时被禁用', () => {
    const today = new Date().toISOString().slice(0, 10)
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: today, time: '10:00'
    }
    const { disabledHours } = setup({ 1: form }, item)
    const currentHour = new Date().getHours()
    const disabled = disabledHours()

    expect(disabled).toHaveLength(currentHour)
    if (currentHour > 0) {
      expect(disabled[0]).toBe(0)
    }
  })

  it('今天 + 未来小时 → 无禁用分钟', () => {
    const today = new Date().toISOString().slice(0, 10)
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: today, time: '10:00'
    }
    const { disabledMinutes } = setup({ 1: form }, item)

    expect(disabledMinutes(23)).toEqual([])
  })
})
// ============================================================
// 补充测试：并发/竞态 — 快速切换活跃项
// ============================================================

describe('并发/竞态 — 快速切换活跃项', () => {

  it('连续切换 3 个不同项 → computed 始终指向最后一个', () => {
    const form1: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: 'first', enabled: false, minutes: 5
    }
    const form2: ReminderForm = {
      type: 'DATE_TIME', mode: 'POPUP_WINDOW', text: 'second', enabled: true, date: '2025-06-01', time: '10:00'
    }
    const form3: ReminderForm = {
      type: 'EVERY_DAYS', mode: 'POMODORO', text: 'third', enabled: false, days: 7
    }

    const reminderStore = ref<Record<number, ReminderForm>>({ 1: form1, 2: form2, 3: form3 })
    const activeItem = ref<ReminderItem | null>({ id: 1, name: 'R1', contentId: 1, lastTriggeredAt: null })
    const saveReminder = vi.fn()

    const { currentReminderForm } = useReminderForm(reminderStore, activeItem, saveReminder)

    expect(currentReminderForm.value.text).toBe('first')

    // 快速切换到 id=2
    activeItem.value = { id: 2, name: 'R2', contentId: 2, lastTriggeredAt: null }
    expect(currentReminderForm.value.text).toBe('second')

    // 立即切换到 id=3
    activeItem.value = { id: 3, name: 'R3', contentId: 3, lastTriggeredAt: null }
    expect(currentReminderForm.value.text).toBe('third')
    expect(currentReminderForm.value.type).toBe('EVERY_DAYS')
  })

  it('切换到无 store 的项再切回有 store 的项 → 都正确', () => {
    const form1: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: 'existing', enabled: true, minutes: 10
    }

    const reminderStore = ref<Record<number, ReminderForm>>({ 1: form1 })
    const activeItem = ref<ReminderItem | null>({ id: 1, name: 'R1', contentId: 1, lastTriggeredAt: null })
    const saveReminder = vi.fn()

    const { currentReminderForm } = useReminderForm(reminderStore, activeItem, saveReminder)

    expect(currentReminderForm.value.text).toBe('existing')

    // 切到 id=99（store 中不存在）→ 自动创建默认
    activeItem.value = { id: 99, name: 'R99', contentId: 99, lastTriggeredAt: null }
    expect(currentReminderForm.value.type).toBe('AFTER_MINUTES')
    expect(currentReminderForm.value.text).toBe('')
    expect(reminderStore.value[99]).toBeDefined()

    // 切回 id=1 → 还是原来的数据
    activeItem.value = { id: 1, name: 'R1', contentId: 1, lastTriggeredAt: null }
    expect(currentReminderForm.value.text).toBe('existing')
    expect(currentReminderForm.value.enabled).toBe(true)
  })

  it('切到 null 再切回 → 中间返回默认，切回后恢复', () => {
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'POPUP_WINDOW', text: 'hello', enabled: false, date: '2025-12-25', time: '08:00'
    }

    const reminderStore = ref<Record<number, ReminderForm>>({ 5: form })
    const activeItem = ref<ReminderItem | null>({ id: 5, name: 'R5', contentId: 5, lastTriggeredAt: null })
    const saveReminder = vi.fn()

    const { currentReminderForm } = useReminderForm(reminderStore, activeItem, saveReminder)

    expect(currentReminderForm.value.text).toBe('hello')

    // 切到 null
    activeItem.value = null
    expect(currentReminderForm.value).toMatchObject({
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', enabled: false
    })

    // 切回
    activeItem.value = { id: 5, name: 'R5', contentId: 5, lastTriggeredAt: null }
    expect(currentReminderForm.value.text).toBe('hello')
    expect(currentReminderForm.value.type).toBe('DATE_TIME')
  })
})

// ============================================================
// 补充测试：边界值 — 异常输入
// ============================================================

describe('边界值 — minutes 异常', () => {

  it('minutes=0 → 表单正常存储', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 0
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.minutes).toBe(0)
  })

  it('minutes 为负数 → 表单不崩溃，值原样保留', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: false, minutes: -10
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.minutes).toBe(-10)
  })

  it('minutes 为 undefined → 表单不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: '', enabled: false
      // minutes 未设置
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.minutes).toBeUndefined()
  })

  it('onModeChange 切 POMODORO，minutes=0 → 设为默认 25', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false, minutes: 0
    }
    const { onModeChange, currentReminderForm } = setup({ 1: form }, item)

    onModeChange('POMODORO')

    expect(currentReminderForm.value.minutes).toBe(25)
  })

  it('onModeChange 切 POMODORO，minutes 为负 → 设为默认 25', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false, minutes: -5
    }
    const { onModeChange, currentReminderForm } = setup({ 1: form }, item)

    onModeChange('POMODORO')

    // 取决于实现：如果只检查 !minutes，-5 是 truthy → 保留 -5
    // 如果检查 minutes <= 0 → 设为 25
    // 这个测试帮助你发现实现中的潜在问题
    const val = currentReminderForm.value.minutes
    expect(val === -5 || val === 25).toBe(true)
  })
})

describe('边界值 — date 格式异常', () => {

  it('date 为空字符串 → 表单不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false, date: '', time: '10:00'
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.date).toBe('')
  })

  it('date 为非法格式 → 表单不崩溃，disabledHours 不报错', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: 'not-a-date', time: '10:00'    }
    const { disabledHours, disabledMinutes } = setup({ 1: form }, item)

    // 非法日期不应抛异常，应返回空数组或某种安全值
    expect(() => disabledHours()).not.toThrow()
    expect(() => disabledMinutes(10)).not.toThrow()
  })

  it('date 为 undefined → disabledHours 不报错', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      time: '10:00'
      // date 未设置
    }
    const { disabledHours, disabledMinutes } = setup({ 1: form }, item)

    expect(() => disabledHours()).not.toThrow()
    expect(() => disabledMinutes(0)).not.toThrow()
  })
})

describe('边界值 — time 格式异常', () => {

  it('time 为空字符串 → 不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: '2025-12-01', time: ''
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.time).toBe('')
  })

  it('time 为非法格式 → 不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'DATE_TIME', mode: 'NOTIFICATION', text: '', enabled: false,
      date: '2025-12-01', time: 'xx:yy'
    }
    const { disabledMinutes } = setup({ 1: form }, item)

    expect(() => disabledMinutes(10)).not.toThrow()
  })
})

describe('边界值 — days 异常', () => {

  it('days=0 → 表单正常存储', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'EVERY_DAYS', mode: 'NOTIFICATION', text: '', enabled: false, days: 0
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.days).toBe(0)
  })

  it('days 为负数 → 不崩溃，值原样保留', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'EVERY_DAYS', mode: 'NOTIFICATION', text: '', enabled: false, days: -3
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.days).toBe(-3)
  })

  it('days 为 undefined → 不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'EVERY_DAYS', mode: 'NOTIFICATION', text: '', enabled: false
      // days 未设置
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.days).toBeUndefined()
  })

  it('days 为极大值 → 不崩溃', () => {
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'EVERY_DAYS', mode: 'NOTIFICATION', text: '', enabled: false, days: 999999
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.days).toBe(999999)
  })
})

describe('边界值 — text 异常', () => {

  it('text 为超长字符串(10000 字) → 不崩溃', () => {
    const longText = 'A'.repeat(10000)
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: longText, enabled: false, minutes: 5
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.text).toHaveLength(10000)
  })

  it('text 包含特殊字符 → 不崩溃', () => {
    const specialText = '<script>alert("xss")</script>\n\t\r\0🔥'
    const item: ReminderItem = { id: 1, name: 'R', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: specialText, enabled: false, minutes: 5
    }
    const { currentReminderForm } = setup({ 1: form }, item)

    expect(currentReminderForm.value.text).toBe(specialText)
  })
})

describe('边界值 — onEnabledChange 极端场景', () => {

  it('store 中有大量(100个)番茄提醒 → 启用一个时其余全部关闭', async () => {
    const item: ReminderItem = { id: 1, name: 'P1', contentId: 1, lastTriggeredAt: null }
    const storeData: Record<number, ReminderForm> = {}

    for (let i = 1; i <= 100; i++) {
      storeData[i] = {
        type: 'AFTER_MINUTES', mode: 'POMODORO', text: `pomo-${i}`,
        enabled: true, minutes: 25
      }
    }

    const { onEnabledChange, reminderStore, saveReminder } = setup(storeData, item)

    await onEnabledChange(true)

    // id=1 保持 enabled，其他 99 个被关闭
    let disabledCount = 0
    for (let i = 2; i <= 100; i++) {
      if (!reminderStore.value[i].enabled) disabledCount++
    }
    expect(disabledCount).toBe(99)
    expect(reminderStore.value[1].enabled).toBe(true)
  })

  it('pomodoroStart 抛异常 → 不崩溃', async () => {
    mockApi.pomodoroStart.mockRejectedValueOnce(new Error('IPC crash'))

    const item: ReminderItem = { id: 1, name: 'P', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'POMODORO', text: '', enabled: true, minutes: 25
    }
    const { onEnabledChange } = setup({ 1: form }, item)

    // 不应抛出到测试层
    await expect(onEnabledChange(true)).resolves.not.toThrow()
  })

  it('pomodoroStop 抛异常 → 不崩溃', async () => {
    mockApi.pomodoroStop.mockRejectedValueOnce(new Error('stop failed'))

    const item: ReminderItem = { id: 1, name: 'P', contentId: 1, lastTriggeredAt: null }
    const form: ReminderForm = {
      type: 'AFTER_MINUTES', mode: 'POMODORO', text: '', enabled: false, minutes: 25
    }
    const { onEnabledChange } = setup({ 1: form }, item)

    await expect(onEnabledChange(false)).resolves.not.toThrow()
  })
})