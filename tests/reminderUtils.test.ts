/**
 * ============================================================
 * 测试对象: src/services/reminderUtils.ts
 * 测试类型: 单元测试 (Unit Testing)
 * 测试方法: 黑盒测试 — 数据驱动测试 (Data-Driven Testing)
 *
 * 定义:
 *   数据驱动测试验证常量/配置数据的完整性与结构正确性。
 *   虽然被测对象只是一个常量数组，但它是业务逻辑的基础数据，
 *   如果被意外修改（少了一项、key 拼写错误），会导致提醒功能
 *   整体失效。
 *
 * 目的:
 *   作为回归测试的安全网，确保重构或合并代码时不会意外破坏
 *   提醒类型的配置。此类测试也称为 "快照式断言"(snapshot-like)，
 *   用于锁定关键业务常量。
 * ============================================================
 */

import { describe, it, expect } from 'vitest'
import { REMINDER_TYPES } from '../src/services/reminderUtils'

describe('REMINDER_TYPES — 提醒类型配置', () => {

  it('应包含 3 种提醒类型', () => {
    expect(REMINDER_TYPES).toHaveLength(3)
  })

  it('每项都有 key 和 labelKey 字段', () => {
    REMINDER_TYPES.forEach((item) => {
      expect(item).toHaveProperty('key')
      expect(item).toHaveProperty('labelKey')
      expect(typeof item.key).toBe('string')
      expect(typeof item.labelKey).toBe('string')
    })
  })

  it('包含 AFTER_MINUTES 类型', () => {
    const keys = REMINDER_TYPES.map((r) => r.key)
    expect(keys).toContain('AFTER_MINUTES')
  })

  it('包含 DATE_TIME 类型', () => {
    const keys = REMINDER_TYPES.map((r) => r.key)
    expect(keys).toContain('DATE_TIME')
  })

  it('包含 EVERY_DAYS 类型', () => {
    const keys = REMINDER_TYPES.map((r) => r.key)
    expect(keys).toContain('EVERY_DAYS')
  })
})