/**
 * format.ts 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  formatTime,
  formatDateTime,
  padZero,
  getNextHourTimestamp,
  isExpired,
  extractTitleFromHtml
} from '../format'

describe('format.ts', () => {
  describe('formatTime', () => {
    it('应该正确格式化时间戳为 MM-DD HH:mm 格式', () => {
      // 2024-01-15 14:30:00
      const timestamp = new Date(2024, 0, 15, 14, 30, 0).getTime()
      expect(formatTime(timestamp)).toBe('01-15 14:30')
    })

    it('应该处理月份和日期的补零', () => {
      // 2024-09-05 08:05:00
      const timestamp = new Date(2024, 8, 5, 8, 5, 0).getTime()
      expect(formatTime(timestamp)).toBe('09-05 08:05')
    })

    it('应该在时间戳为 null 时返回 "--"', () => {
      expect(formatTime(null)).toBe('--')
    })

    it('应该在时间戳为 undefined 时返回 "--"', () => {
      expect(formatTime(undefined)).toBe('--')
    })

    it('应该正确处理时间戳为 0 的情况', () => {
      // 时间戳 0 对应 1970-01-01 08:00:00 (UTC+8)
      const result = formatTime(0)
      expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })
  })

  describe('formatDateTime', () => {
    it('应该正确格式化时间戳为 YYYY-MM-DD HH:mm 格式', () => {
      // 2024-01-15 14:30:00
      const timestamp = new Date(2024, 0, 15, 14, 30, 0).getTime()
      expect(formatDateTime(timestamp)).toBe('2024-01-15 14:30')
    })

    it('应该处理所有字段的补零', () => {
      // 2024-09-05 08:05:00
      const timestamp = new Date(2024, 8, 5, 8, 5, 0).getTime()
      expect(formatDateTime(timestamp)).toBe('2024-09-05 08:05')
    })

    it('应该在时间戳为 null 时返回 "--"', () => {
      expect(formatDateTime(null)).toBe('--')
    })

    it('应该在时间戳为 undefined 时返回 "--"', () => {
      expect(formatDateTime(undefined)).toBe('--')
    })
  })

  describe('padZero', () => {
    it('应该将单位数字补零为两位', () => {
      expect(padZero(5)).toBe('05')
      expect(padZero(0)).toBe('00')
      expect(padZero(9)).toBe('09')
    })

    it('应该保持两位数字不变', () => {
      expect(padZero(10)).toBe('10')
      expect(padZero(99)).toBe('99')
      expect(padZero(12)).toBe('12')
    })

    it('应该处理三位数字', () => {
      expect(padZero(100)).toBe('100')
    })
  })

  describe('getNextHourTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该返回下一个整点的时间戳', () => {
      // 设置当前时间为 2024-01-15 14:30:45
      const now = new Date(2024, 0, 15, 14, 30, 45)
      vi.setSystemTime(now)

      const result = getNextHourTimestamp()
      const resultDate = new Date(result)

      expect(resultDate.getHours()).toBe(15)
      expect(resultDate.getMinutes()).toBe(0)
      expect(resultDate.getSeconds()).toBe(0)
      expect(resultDate.getMilliseconds()).toBe(0)
    })

    it('应该在整点时返回下一个整点', () => {
      // 设置当前时间为 2024-01-15 14:00:00
      const now = new Date(2024, 0, 15, 14, 0, 0)
      vi.setSystemTime(now)

      const result = getNextHourTimestamp()
      const resultDate = new Date(result)

      expect(resultDate.getHours()).toBe(15)
    })

    it('应该正确处理跨天的情况', () => {
      // 设置当前时间为 2024-01-15 23:30:00
      const now = new Date(2024, 0, 15, 23, 30, 0)
      vi.setSystemTime(now)

      const result = getNextHourTimestamp()
      const resultDate = new Date(result)

      expect(resultDate.getDate()).toBe(16)
      expect(resultDate.getHours()).toBe(0)
    })
  })

  describe('isExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该在时间戳早于当前时间时返回 true', () => {
      const now = new Date(2024, 0, 15, 14, 0, 0)
      vi.setSystemTime(now)

      const pastTimestamp = new Date(2024, 0, 15, 13, 0, 0).getTime()
      expect(isExpired(pastTimestamp)).toBe(true)
    })

    it('应该在时间戳晚于当前时间时返回 false', () => {
      const now = new Date(2024, 0, 15, 14, 0, 0)
      vi.setSystemTime(now)

      const futureTimestamp = new Date(2024, 0, 15, 15, 0, 0).getTime()
      expect(isExpired(futureTimestamp)).toBe(false)
    })

    it('应该在时间戳等于当前时间时返回 false', () => {
      const now = new Date(2024, 0, 15, 14, 0, 0)
      vi.setSystemTime(now)

      expect(isExpired(now.getTime())).toBe(false)
    })
  })

  describe('extractTitleFromHtml', () => {
    it('应该从 HTML 中提取纯文本', () => {
      const html = '<div>Hello <strong>World</strong></div>'
      expect(extractTitleFromHtml(html)).toBe('Hello World')
    })

    it('应该处理多个空格和换行', () => {
      const html = '<p>Hello</p>   <p>World</p>'
      expect(extractTitleFromHtml(html)).toBe('Hello World')
    })

    it('应该在内容为空时返回默认值', () => {
      expect(extractTitleFromHtml('')).toBe('随心记')
      expect(extractTitleFromHtml('<div></div>')).toBe('随心记')
      expect(extractTitleFromHtml('<div>   </div>')).toBe('随心记')
    })

    it('应该支持自定义默认值', () => {
      expect(extractTitleFromHtml('', '无标题')).toBe('无标题')
    })

    it('应该处理 undefined 输入', () => {
      expect(extractTitleFromHtml(undefined as unknown as string)).toBe('随心记')
    })

    it('应该处理复杂的 HTML 结构', () => {
      const html = `
        <div class="content">
          <h1>标题</h1>
          <p>这是<em>一段</em>内容</p>
        </div>
      `
      expect(extractTitleFromHtml(html)).toBe('标题 这是 一段 内容')
    })
  })
})

