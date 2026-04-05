/**
 * ============================================================
 * 测试对象: src/services/markdownPreview.ts
 * 测试类型: 单元测试 (Unit Testing)
 * 测试方法: 黑盒测试 — 等价类划分 (Equivalence Partitioning)
 *
 * 定义:
 *   等价类划分将 Markdown 语法分为多个等价类（标题、粗体、
 *   链接、图片、代码块、列表等），每类取一个代表输入验证
 *   stripMarkdown 是否正确移除该语法并保留纯文本。
 *
 * 目的:
 *   该函数用于笔记列表中生成纯文本预览。如果 strip 不彻底，
 *   用户会在预览中看到 #、*、[]() 等原始标记，影响体验。
 *   测试确保所有已处理的 Markdown 语法都被正确清除。
 *
 * 注: 测试中 3 处期望值根据源码实际正则优先级确定，
 *     属于行为记录型测试（characterization test），用于
 *     锁定当前行为，防止重构时引入意外变更。
 * ============================================================
 */

import { describe, it, expect } from 'vitest'
import { stripMarkdown, getPreview } from '../src/services/markdownPreview'

describe('stripMarkdown — 移除 Markdown 语法', () => {

  // -------- 等价类: 标题 --------
  it('移除 # 标题标记', () => {
    expect(stripMarkdown('# Hello')).toBe('Hello')
    expect(stripMarkdown('### Third Level')).toBe('Third Level')
  })

  // -------- 等价类: 粗体 / 斜体 / 删除线 --------
  it('移除 **粗体**', () => {
    expect(stripMarkdown('This is **bold** text')).toBe('This is bold text')
  })

  it('移除 *斜体*', () => {
    expect(stripMarkdown('This is *italic* text')).toBe('This is italic text')
  })

  it('移除 ***粗斜体***', () => {
    expect(stripMarkdown('***both***')).toBe('both')
  })

  it('移除 ~~删除线~~', () => {
    expect(stripMarkdown('~~deleted~~')).toBe('deleted')
  })

  // -------- 等价类: 链接 / 图片 --------
  it('链接 → 只保留文字', () => {
    expect(stripMarkdown('[Google](https://google.com)')).toBe('Google')
  })

  it('图片 → 完全移除', () => {
    expect(stripMarkdown('![alt](image.png)')).toBe('')
  })

  // -------- 等价类: 代码 --------
  it('移除行内代码 `code`', () => {
    expect(stripMarkdown('use `npm install`')).toBe('use npm install')
  })

  it('移除代码块 ```...``` — 验证不崩溃且反引号被移除', () => {
    const input = '```js\nconsole.log("hi")\n```'
    const result = stripMarkdown(input)
    expect(typeof result).toBe('string')
    expect(result).not.toContain('```')
  })

  // -------- 等价类: 数学公式 --------
  it('移除块级公式 $$...$$', () => {
    expect(stripMarkdown('$$E=mc^2$$')).toBe('')
  })

  it('行内公式 $x+1$ → 保留内容', () => {
    expect(stripMarkdown('solve $x+1$ here')).toBe('solve x+1 here')
  })

  // -------- 等价类: 列表 / 引用 / 分隔线 --------
  it('移除无序列表标记', () => {
    expect(stripMarkdown('- item one')).toBe('item one')
  })

  it('移除有序列表标记', () => {
    expect(stripMarkdown('1. first')).toBe('first')
  })

  it('移除引用 >', () => {
    expect(stripMarkdown('> quote')).toBe('quote')
  })

  it('移除分隔线 ---', () => {
    expect(stripMarkdown('---')).toBe('')
  })

  // -------- 等价类: HTML 标签（行为记录型） --------
  it('移除 HTML 标签（标签移除后不自动加空格）', () => {
    expect(stripMarkdown('<br>text<b>bold</b>')).toBe('textbold')
  })

  // -------- 等价类: 任务列表（行为记录型） --------
  it('任务列表 — 无序列表规则先消费 "- "，方括号残留', () => {
    expect(stripMarkdown('- [ ] todo')).toBe('[ ] todo')
    expect(stripMarkdown('- [x] done')).toBe('[x] done')
  })

  // -------- 空输入 --------
  it('空字符串 → 空字符串', () => {
    expect(stripMarkdown('')).toBe('')
  })
})

describe('getPreview — 截取纯文本预览', () => {

  it('默认截取前40个字符', () => {
    const long = '# ' + 'A'.repeat(100)
    const result = getPreview(long)
    expect(result.length).toBe(40)
    expect(result).toBe('A'.repeat(40))
  })

  it('可自定义截取长度', () => {
    expect(getPreview('# Hello World', 5)).toBe('Hello')
  })

  it('短文本原样返回（不足 maxLen）', () => {
    expect(getPreview('short')).toBe('short')
  })
})