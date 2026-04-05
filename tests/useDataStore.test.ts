/**
 * ============================================================
 * 测试对象: src/composables/useDataStore.ts
 * 测试类型: 单元测试 (Unit Testing)
 * 测试方法: 黑盒测试 — 等价类划分 + 边界值分析
 *
 * 定义:
 *   useDataStore 封装了笔记和提醒的 CRUD 操作，内部通过
 *   window.api（Electron IPC）与主进程通信。测试通过 mock
 *   window.api 隔离 IPC 层，验证数据流转逻辑。
 *
 * 等价类:
 *   1. loadNotes — 空数组 / 多条记录 / 含 null 字段
 *   2. loadReminders — 正常加载 / 异常捕获
 *   3. saveNote — 存在的 id / 不存在的 id
 *   4. saveReminder — 完整表单 / 缺失表单
 *   5. scheduleSave — 防抖行为（多次调用只触发一次）
 *   6. registerSaveBeforeClose — 关闭前保存全部
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDataStore } from '../src/composables/useDataStore'

// ---- mock window.api ----
const mockApi = {
  notesGetAll: vi.fn(),
  reminderGetAll: vi.fn(),
  notesUpsert: vi.fn(),
  reminderUpsert: vi.fn(),
  pomodoroStop: vi.fn(),
  onSaveBeforeClose: vi.fn(),
  notifySaveDone: vi.fn(),
  onNotesChanged: vi.fn(),
  onRemindersChanged: vi.fn(),
  onPomodoroClosed: vi.fn(),
  pomodoroStart: vi.fn(),
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()

  // 默认返回空数组
  mockApi.notesGetAll.mockResolvedValue([])
  mockApi.reminderGetAll.mockResolvedValue([])
  mockApi.notesUpsert.mockResolvedValue(undefined)
  mockApi.reminderUpsert.mockResolvedValue(undefined)
  mockApi.pomodoroStop.mockResolvedValue(undefined)

  // 挂到 window
  ;(globalThis as any).window = {
    api: mockApi,
    clearTimeout: clearTimeout,
    setTimeout: setTimeout,
  }
})

describe('useDataStore — loadNotes', () => {

  it('空数组 → notes 为空，contentStore 只保留初始值', async () => {
    mockApi.notesGetAll.mockResolvedValue([])
    const { dataMap, contentStore, loadNotes } = useDataStore()

    await loadNotes()

    expect(dataMap.value.notes).toEqual([])
    expect(mockApi.notesGetAll).toHaveBeenCalledOnce()
  })

  it('多条记录 → 正确映射字段', async () => {
    mockApi.notesGetAll.mockResolvedValue([
      { id: 1, title: 'Note A', content: 'aaa', createAt: 1000, updatedAt: 2000, pinned: 1 },
      { id: 2, title: 'Note B', content: null, createAt: 3000, updatedAt: null, pinned: 0 },
    ])

    const { dataMap, contentStore, loadNotes } = useDataStore()
    await loadNotes()

    expect(dataMap.value.notes).toHaveLength(2)
    expect(dataMap.value.notes[0]).toMatchObject({
      id: 1, name: 'Note A', contentId: 1, pinned: true
    })
    expect(dataMap.value.notes[1]).toMatchObject({
      id: 2, name: 'Note B', pinned: false
    })
    expect(contentStore.value[1]).toBe('aaa')
    expect(contentStore.value[2]).toBe('')  // null → ''
  })
})

describe('useDataStore — loadReminders', () => {

  it('正常加载 → 映射所有字段', async () => {
    mockApi.reminderGetAll.mockResolvedValue([
      {
        id: 10, title: 'Wake up', type: 'AFTER_MINUTES', mode: 'NOTIFICATION',
        text: 'hello', enabled: 1, minutes: 30, date: null, time: null, days: null,
        createAt: 1000, updatedAt: 2000, pinned: 0, lastTriggeredAt: null
      }
    ])

    const { dataMap, reminderStore, loadReminders } = useDataStore()
    await loadReminders()

    expect(dataMap.value.reminders).toHaveLength(1)
    expect(dataMap.value.reminders[0]).toMatchObject({
      id: 10, name: 'Wake up', lastTriggeredAt: null
    })
    expect(reminderStore.value[10]).toMatchObject({
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', enabled: true
    })
  })

  it('API 抛异常 → 不崩溃，reminders 不变', async () => {
    mockApi.reminderGetAll.mockRejectedValue(new Error('db error'))

    const { dataMap, loadReminders } = useDataStore()
    const before = [...dataMap.value.reminders]

    await loadReminders() // 不应该抛出

    expect(dataMap.value.reminders).toEqual(before)
  })
})

describe('useDataStore — saveNote', () => {

  it('存在的 id → 调用 notesUpsert', async () => {
    const { dataMap, contentStore, saveReminder } = useDataStore()

    // 手动准备数据
    dataMap.value.notes = [
      { id: 5, name: 'Test', contentId: 5, createAt: 1000, updatedAt: 2000, pinned: false }
    ]
    contentStore.value[5] = 'hello world'

    // saveNote 没有 return，我们通过内部调用获取
    const store = useDataStore()
    store.dataMap.value.notes = [
      { id: 5, name: 'Test', contentId: 5, createAt: 1000, updatedAt: 2000, pinned: false }
    ]
    store.contentStore.value[5] = 'hello world'

    // scheduleSave 内部会调 saveNote
    store.scheduleSave(5)
    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, title: 'Test', content: 'hello world' })
    )
  })

  it('不存在的 id → 不调用 notesUpsert', async () => {
    const store = useDataStore()
    store.dataMap.value.notes = [] // 空

    store.scheduleSave(999)
    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).not.toHaveBeenCalled()
  })
})

describe('useDataStore — saveReminder', () => {

  it('item 和 form 都存在 → 调用 reminderUpsert', async () => {
    const { dataMap, reminderStore, saveReminder } = useDataStore()

    dataMap.value.reminders = [
      { id: 20, name: 'R1', contentId: 20, createAt: 100, updatedAt: 200, pinned: false, lastTriggeredAt: null }
    ]
    reminderStore.value[20] = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: 'hey', enabled: true, minutes: 10
    }

    await saveReminder(20)

    expect(mockApi.reminderUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 20, title: 'R1', text: 'hey', enabled: 1, minutes: 10 })
    )
  })

  it('form 不存在 → 不调用 reminderUpsert', async () => {
    const { dataMap, reminderStore, saveReminder } = useDataStore()

    dataMap.value.reminders = [
      { id: 30, name: 'R2', contentId: 30, lastTriggeredAt: null }
    ]
    // reminderStore 没有 id=30

    await saveReminder(30)

    expect(mockApi.reminderUpsert).not.toHaveBeenCalled()
  })
})

describe('useDataStore — scheduleSave 防抖', () => {

  it('500ms 内多次调用 → 只保存一次', async () => {
    const store = useDataStore()
    store.dataMap.value.notes = [
      { id: 1, name: 'N', contentId: 1, createAt: 100, updatedAt: 200, pinned: false }
    ]
    store.contentStore.value[1] = 'text'

    store.scheduleSave(1)
    store.scheduleSave(1)
    store.scheduleSave(1)

    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).toHaveBeenCalledTimes(1)
  })
})

describe('useDataStore — registerSaveBeforeClose', () => {

  it('注册回调 → 关闭时保存所有笔记和提醒', async () => {
    const store = useDataStore()
    store.dataMap.value.notes = [
      { id: 1, name: 'N1', contentId: 1, createAt: 100, updatedAt: 200, pinned: false }
    ]
    store.contentStore.value[1] = 'c1'
    store.dataMap.value.reminders = []

    store.registerSaveBeforeClose()

    // 获取注册的回调并执行
    const callback = mockApi.onSaveBeforeClose.mock.calls[0][0]
    await callback()

    expect(mockApi.notesUpsert).toHaveBeenCalled()
    expect(mockApi.notifySaveDone).toHaveBeenCalled()
  })
})
// ============================================================
// 补充测试：新增/删除条目
// ============================================================

describe('useDataStore — 新增条目后保存', () => {

  it('新增 note → scheduleSave → 调用 notesUpsert', async () => {
    const store = useDataStore()

    // 模拟新增
    const newNote = { id: 100, name: 'New Note', contentId: 100, createAt: Date.now(), updatedAt: null, pinned: false }
    store.dataMap.value.notes.push(newNote)
    store.contentStore.value[100] = 'brand new content'

    store.scheduleSave(100)
    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 100, title: 'New Note', content: 'brand new content' })
    )
  })

  it('新增 reminder → saveReminder → 调用 reminderUpsert', async () => {
    const store = useDataStore()

    const newReminder = { id: 200, name: 'New Reminder', contentId: 200, createAt: Date.now(), updatedAt: null, pinned: false, lastTriggeredAt: null }
    store.dataMap.value.reminders.push(newReminder)
    store.reminderStore.value[200] = {
      type: 'EVERY_DAYS', mode: 'POPUP_WINDOW', text: 'daily check', enabled: true, days: 3
    }

    await store.saveReminder(200)

    expect(mockApi.reminderUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 200, title: 'New Reminder', text: 'daily check', days: 3 })
    )
  })
})

describe('useDataStore — 删除条目后清理', () => {

  it('删除 note 后 → contentStore 中残留数据不影响其他保存', async () => {
    const store = useDataStore()

    // 先添加两条
    store.dataMap.value.notes = [
      { id: 1, name: 'N1', contentId: 1, createAt: 100, updatedAt: 200, pinned: false },
      { id: 2, name: 'N2', contentId: 2, createAt: 100, updatedAt: 200, pinned: false },
    ]
    store.contentStore.value[1] = 'content1'
    store.contentStore.value[2] = 'content2'

    // 删除 id=1（从 dataMap 移除）
    store.dataMap.value.notes = store.dataMap.value.notes.filter(n => n.id !== 1)

    // 尝试保存已删除的 id → 不应调用 upsert
    store.scheduleSave(1)
    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).not.toHaveBeenCalled()

    // 保存存在的 id=2 → 正常调用
    store.scheduleSave(2)
    await vi.advanceTimersByTimeAsync(600)

    expect(mockApi.notesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, title: 'N2', content: 'content2' })
    )
  })

  it('删除 reminder 后 → reminderStore 残留不影响其他保存', async () => {
    const store = useDataStore()

    store.dataMap.value.reminders = [
      { id: 10, name: 'R10', contentId: 10, lastTriggeredAt: null },
      { id: 11, name: 'R11', contentId: 11, lastTriggeredAt: null },
    ]
    store.reminderStore.value[10] = {
      type: 'AFTER_MINUTES', mode: 'NOTIFICATION', text: 'a', enabled: true, minutes: 5
    }
    store.reminderStore.value[11] = {
      type: 'DATE_TIME', mode: 'POPUP_WINDOW', text: 'b', enabled: false, date: '2025-01-01', time: '09:00'
    }

    // 删除 id=10
    store.dataMap.value.reminders = store.dataMap.value.reminders.filter(r => r.id !== 10)

    // 保存已删除的 → 不调用（item 找不到）
    await store.saveReminder(10)
    expect(mockApi.reminderUpsert).not.toHaveBeenCalled()

    // 保存存在的 id=11 → 正常
    await store.saveReminder(11)
    expect(mockApi.reminderUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11, title: 'R11' })
    )
  })

  it('删除全部 notes → registerSaveBeforeClose 不调用 notesUpsert', async () => {
    const store = useDataStore()
    store.dataMap.value.notes = []
    store.dataMap.value.reminders = []

    store.registerSaveBeforeClose()
    const callback = mockApi.onSaveBeforeClose.mock.calls[0][0]
    await callback()

    expect(mockApi.notesUpsert).not.toHaveBeenCalled()
    expect(mockApi.reminderUpsert).not.toHaveBeenCalled()
    expect(mockApi.notifySaveDone).toHaveBeenCalled()
  })
})