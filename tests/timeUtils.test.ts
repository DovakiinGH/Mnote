/**
 * ============================================================
 * 测试对象: src/services/timeUtils.ts
 * 测试类型: 单元测试 (Unit Testing)
 * 测试方法: 黑盒测试 — 等价类划分 (Equivalence Partitioning)
 *          + 边界值分析 (Boundary Value Analysis)
 *
 * 定义:
 *   单元测试是对软件中最小可测试单元（函数）进行隔离验证，
 *   确保其在各种输入条件下产生正确输出。
 *
 *   黑盒测试不关心函数内部实现，只根据输入/输出规格设计用例。
 *
 *   等价类划分: 将所有可能输入分为若干等价类，从每类中取
 *   代表值进行测试。本文件划分为:
 *     - 有效时间戳 (正常正整数)
 *     - 无效输入   (null / undefined / 0 / NaN)
 *
 *   边界值分析: 针对边界条件设计用例，如 0、负数、极大时间戳。
 *
 * 目的:
 *   验证时间格式化函数在正常输入与异常输入下都能返回预期结果，
 *   防止页面上出现 "NaN-NaN-NaN" 或程序崩溃。
 * ============================================================
 */

import { describe, it, expect } from 'vitest'
import { formatTime, formatDuration } from '../src/services/timeUtils'

describe('formatTime — 时间戳格式化', () => {

  // -------- 等价类: 无效输入 --------
  it('传入 undefined 返回空字符串', () => {
    expect(formatTime(undefined)).toBe('')
  })

  it('传入 null 返回空字符串', () => {
    expect(formatTime(null)).toBe('')
  })

  it('传入 0 返回空字符串（falsy 值）', () => {
    expect(formatTime(0)).toBe('')
  })

  it('传入 NaN 返回空字符串', () => {
    expect(formatTime(NaN)).toBe('')
  })

  // -------- 等价类: 有效时间戳 --------
  it('正确格式化一个已知时间戳', () => {
    // 2025-01-15 08:30 (本地时间) 的时间戳
    const ts = new Date(2025, 0, 15, 8, 30).getTime()
    expect(formatTime(ts)).toBe('2025-01-15 08:30')
  })

  it('月份和日期补零：3月5日 → 03-05', () => {
    const ts = new Date(2025, 2, 5, 9, 5).getTime()
    expect(formatTime(ts)).toBe('2025-03-05 09:05')
  })

  // -------- 边界值: 极端时间 --------
  it('能处理午夜 00:00', () => {
    const ts = new Date(2025, 5, 1, 0, 0).getTime()
    expect(formatTime(ts)).toBe('2025-06-01 00:00')
  })

  it('能处理 23:59', () => {
    const ts = new Date(2025, 11, 31, 23, 59).getTime()
    expect(formatTime(ts)).toBe('2025-12-31 23:59')
  })
})

describe('formatDuration — 秒数格式化为 mm:ss', () => {

  // -------- 边界值 --------
  it('0 秒 → 00:00', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('59 秒 → 00:59', () => {
    expect(formatDuration(59)).toBe('00:59')
  })

  it('60 秒 → 01:00', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  // -------- 等价类: 正常值 --------
  it('90 秒 → 01:30', () => {
    expect(formatDuration(90)).toBe('01:30')
  })

  it('3661 秒 → 61:01（允许超过60分钟）', () => {
    expect(formatDuration(3661)).toBe('61:01')
  })
})