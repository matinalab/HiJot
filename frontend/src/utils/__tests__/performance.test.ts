/**
 * performance.ts 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { perfMonitor, PerformanceMonitor } from '../performance'

// Mock performance API
const createPerformanceMock = () => {
  const marks: Record<string, number> = {}
  const measures: Array<{ name: string; duration: number; startTime: number }> = []
  const entries: Record<string, PerformanceEntry[]> = {
    navigation: [],
    resource: [],
    'largest-contentful-paint': []
  }

  return {
    now: vi.fn(() => Date.now()),
    mark: vi.fn((name: string) => {
      marks[name] = Date.now()
    }),
    measure: vi.fn((name: string, startMark: string, endMark: string) => {
      const duration = (marks[endMark] || Date.now()) - (marks[startMark] || 0)
      measures.push({ name, duration, startTime: marks[startMark] || 0 })
    }),
    getEntriesByName: vi.fn((name: string) => {
      // 检查是否是 FCP
      if (name === 'first-contentful-paint') {
        return [{ startTime: 150 }]
      }
      // 返回 measures 中匹配的条目
      return measures.filter(m => m.name === name)
    }),
    getEntriesByType: vi.fn((type: string) => {
      if (type === 'navigation') {
        return [{
          domainLookupStart: 0,
          domainLookupEnd: 10,
          connectStart: 10,
          connectEnd: 30,
          requestStart: 30,
          responseStart: 50,
          responseEnd: 100,
          domInteractive: 200,
          domComplete: 400,
          loadEventEnd: 500,
          startTime: 0
        }]
      }
      if (type === 'resource') {
        return [
          {
            name: 'https://example.com/script.js',
            initiatorType: 'script',
            duration: 150,
            transferSize: 50000,
            decodedBodySize: 50000
          },
          {
            name: 'https://example.com/style.css',
            initiatorType: 'link',
            duration: 80,
            transferSize: 0,
            decodedBodySize: 10000 // cached
          }
        ]
      }
      if (type === 'largest-contentful-paint') {
        return [{ startTime: 250 }]
      }
      return entries[type] || []
    }),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
    },
    // 辅助方法
    _marks: marks,
    _measures: measures
  }
}

describe('performance.ts', () => {
  let performanceMock: ReturnType<typeof createPerformanceMock>
  let monitor: PerformanceMonitor

  beforeEach(() => {
    performanceMock = createPerformanceMock()
    
    // Mock 全局 performance
    vi.stubGlobal('performance', performanceMock)
    
    // Mock PerformanceObserver
    vi.stubGlobal('PerformanceObserver', class {
      observe() {}
      disconnect() {}
    })

    // 创建新的监控实例
    monitor = new PerformanceMonitor()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe('mark', () => {
    it('应该正确创建性能标记', () => {
      monitor.mark('test-mark')

      expect(performanceMock.mark).toHaveBeenCalledWith('test-mark')
    })

    it('应该支持多个标记', () => {
      monitor.mark('mark-1')
      monitor.mark('mark-2')
      monitor.mark('mark-3')

      expect(performanceMock.mark).toHaveBeenCalledTimes(3)
    })
  })

  describe('measure', () => {
    it('应该正确测量两个标记之间的时间', () => {
      monitor.mark('start')
      monitor.mark('end')

      const duration = monitor.measure('test-measure', 'start', 'end')

      expect(performanceMock.measure).toHaveBeenCalledWith('test-measure', 'start', 'end')
      expect(typeof duration).toBe('number')
    })

    // it('应该在测量失败时返回 undefined', () => {
    //   // 模拟 measure 抛出错误
    //   performanceMock.measure.mockImplementationOnce(() => {
    //     throw new Error('Measure failed')
    //   })

    //   const duration = monitor.measure('failed-measure', 'nonexistent-start', 'nonexistent-end')

    //   expect(duration).toBeUndefined()
    // })
  })

  describe('getNavigationTiming', () => {
    it('应该返回正确的导航时间信息', () => {
      // 重新设置 mock 确保返回正确数据
      performanceMock.getEntriesByType.mockImplementation((type: string) => {
        if (type === 'navigation') {
          return [{
            domainLookupStart: 0,
            domainLookupEnd: 10,
            connectStart: 10,
            connectEnd: 30,
            requestStart: 30,
            responseStart: 50,
            responseEnd: 100,
            domInteractive: 200,
            domComplete: 400,
            loadEventEnd: 500,
            startTime: 0
          }]
        }
        if (type === 'largest-contentful-paint') {
          return [{ startTime: 250 }]
        }
        return []
      })

      const timing = monitor.getNavigationTiming()

      expect(timing).not.toBeNull()
      expect(timing).toMatchObject({
        dns: 10,      // domainLookupEnd - domainLookupStart
        tcp: 20,      // connectEnd - connectStart
        request: 20,  // responseStart - requestStart
        response: 50, // responseEnd - responseStart
        domParse: 100, // domInteractive - responseEnd
        domComplete: 300, // domComplete - responseEnd
        pageLoad: 500, // loadEventEnd - startTime
        ttfb: 50      // responseStart - startTime
      })
    })

    it('应该包含 FCP 和 LCP', () => {
      // 重新设置 mock 确保返回正确数据
      performanceMock.getEntriesByType.mockImplementation((type: string) => {
        if (type === 'navigation') {
          return [{
            domainLookupStart: 0,
            domainLookupEnd: 10,
            connectStart: 10,
            connectEnd: 30,
            requestStart: 30,
            responseStart: 50,
            responseEnd: 100,
            domInteractive: 200,
            domComplete: 400,
            loadEventEnd: 500,
            startTime: 0
          }]
        }
        if (type === 'largest-contentful-paint') {
          return [{ startTime: 250 }]
        }
        return []
      })
      performanceMock.getEntriesByName.mockImplementation((name: string) => {
        if (name === 'first-contentful-paint') {
          return [{ startTime: 150 }]
        }
        return []
      })

      const timing = monitor.getNavigationTiming()

      expect(timing?.fcp).toBe(150)
      expect(timing?.lcp).toBe(250)
    })

    it('应该在没有 navigation entries 时返回 null', () => {
      performanceMock.getEntriesByType.mockReturnValueOnce([])

      const timing = monitor.getNavigationTiming()

      expect(timing).toBeNull()
    })

    it('应该在 performance 未定义时返回 null', () => {
      vi.stubGlobal('performance', undefined)
      const newMonitor = new PerformanceMonitor()

      const timing = newMonitor.getNavigationTiming()

      expect(timing).toBeNull()
    })
  })

  describe('getFirstContentfulPaint', () => {
    it('应该返回 FCP 时间', () => {
      const fcp = monitor.getFirstContentfulPaint()

      expect(fcp).toBe(150)
    })

    it('应该在没有 FCP 数据时返回 null', () => {
      performanceMock.getEntriesByName.mockReturnValueOnce([])

      const fcp = monitor.getFirstContentfulPaint()

      expect(fcp).toBeNull()
    })
  })

  describe('getLargestContentfulPaint', () => {
    it('应该返回 LCP 时间', () => {
      const lcp = monitor.getLargestContentfulPaint()

      expect(lcp).toBe(250)
    })

    it('应该在没有 LCP 数据时返回 null', () => {
      performanceMock.getEntriesByType.mockImplementation((type: string) => {
        if (type === 'largest-contentful-paint') return []
        return []
      })

      const lcp = monitor.getLargestContentfulPaint()

      expect(lcp).toBeNull()
    })
  })

  describe('getMemoryUsage', () => {
    it('应该返回正确的内存使用信息', () => {
      const memory = monitor.getMemoryUsage()

      expect(memory).not.toBeNull()
      expect(memory).toMatchObject({
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2048 * 1024 * 1024
      })
      expect(memory?.usagePercent).toBe('2.44%')
    })

    it('应该在 performance.memory 不存在时返回 null', () => {
      vi.stubGlobal('performance', { ...performanceMock, memory: undefined })
      const newMonitor = new PerformanceMonitor()

      const memory = newMonitor.getMemoryUsage()

      expect(memory).toBeNull()
    })
  })

  describe('getResourceTiming', () => {
    it('应该返回资源加载时间列表', () => {
      const resources = monitor.getResourceTiming()

      expect(resources).toHaveLength(2)
      expect(resources[0]).toMatchObject({
        name: 'https://example.com/script.js',
        type: 'script',
        duration: '150.00',
        size: 50000,
        cached: false
      })
    })

    it('应该正确识别缓存的资源', () => {
      const resources = monitor.getResourceTiming()

      // 第二个资源是缓存的（transferSize = 0, decodedBodySize > 0）
      expect(resources[1].cached).toBe(true)
    })

    it('应该在没有资源时返回空数组', () => {
      performanceMock.getEntriesByType.mockReturnValue([])

      const resources = monitor.getResourceTiming()

      expect(resources).toEqual([])
    })
  })

  describe('printReport', () => {
    it('应该调用 console.group 输出报告', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
      const consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {})

      monitor.printReport()

      expect(consoleSpy).toHaveBeenCalledWith('📊 性能监控报告')
      expect(consoleGroupEndSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
      consoleTableSpy.mockRestore()
    })
  })

  describe('全局实例 perfMonitor', () => {
    it('应该导出全局实例', () => {
      expect(perfMonitor).toBeInstanceOf(PerformanceMonitor)
    })

    it('全局实例应该具有所有方法', () => {
      expect(typeof perfMonitor.mark).toBe('function')
      expect(typeof perfMonitor.measure).toBe('function')
      expect(typeof perfMonitor.getNavigationTiming).toBe('function')
      expect(typeof perfMonitor.getMemoryUsage).toBe('function')
      expect(typeof perfMonitor.getResourceTiming).toBe('function')
      expect(typeof perfMonitor.printReport).toBe('function')
    })
  })

  describe('边界情况', () => {
    it('应该在 PerformanceObserver 未定义时优雅处理', () => {
      vi.stubGlobal('PerformanceObserver', undefined)
      const newMonitor = new PerformanceMonitor()

      const fcp = newMonitor.getFirstContentfulPaint()
      const lcp = newMonitor.getLargestContentfulPaint()

      expect(fcp).toBeNull()
      expect(lcp).toBeNull()
    })

    it('应该处理 performance.getEntriesByType 不存在的情况', () => {
      vi.stubGlobal('performance', { 
        now: vi.fn(),
        mark: vi.fn(),
        measure: vi.fn()
        // 没有 getEntriesByType
      })
      const newMonitor = new PerformanceMonitor()

      const resources = newMonitor.getResourceTiming()

      expect(resources).toEqual([])
    })
  })
})

