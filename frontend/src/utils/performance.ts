/**
 * 性能监控工具
 * 用于测量和分析应用性能
 */

/** 导航时间信息 */
interface NavigationTiming {
  dns: number
  tcp: number
  request: number
  response: number
  domParse: number
  domComplete: number
  pageLoad: number
  ttfb: number
  fcp: number | null
  lcp: number | null
}

/** 内存使用信息 */
interface MemoryUsage {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usagePercent: string
}

/** 资源加载时间 */
interface ResourceTiming {
  name: string
  type: string
  duration: string
  size: number
  cached: boolean
}

export class PerformanceMonitor {
  private marks: Record<string, number> = {}
  private measures: Record<string, number> = {}

  /**
   * 标记性能点
   * @param name - 标记名称
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name)
      this.marks[name] = performance.now()
    }
  }

  /**
   * 测量两个标记之间的时间
   * @param name - 测量名称
   * @param startMark - 开始标记
   * @param endMark - 结束标记
   * @returns 测量时间（毫秒）
   */
  measure(name: string, startMark: string, endMark: string): number | undefined {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark)
        const entries = performance.getEntriesByName(name)
        if (entries.length > 0) {
          const measure = entries[0]
          this.measures[name] = measure.duration
          return measure.duration
        }
      } catch (e) {
        console.warn(`Measure ${name} failed:`, e)
      }
    }
    return undefined
  }

  /**
   * 获取导航时间信息
   */
  getNavigationTiming(): NavigationTiming | null {
    if (typeof performance === 'undefined') {
      return null
    }

    // 使用新的 Navigation Timing API
    const entries = performance.getEntriesByType('navigation')
    if (entries.length === 0) {
      return null
    }

    const timing = entries[0] as PerformanceNavigationTiming

    return {
      // DNS查询时间
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP连接时间
      tcp: timing.connectEnd - timing.connectStart,
      // 请求时间
      request: timing.responseStart - timing.requestStart,
      // 响应时间
      response: timing.responseEnd - timing.responseStart,
      // DOM解析时间
      domParse: timing.domInteractive - timing.responseEnd,
      // DOM加载完成时间
      domComplete: timing.domComplete - timing.responseEnd,
      // 页面加载完成时间
      pageLoad: timing.loadEventEnd - timing.startTime,
      // 首字节时间（TTFB）
      ttfb: timing.responseStart - timing.startTime,
      // 首次内容绘制（FCP）
      fcp: this.getFirstContentfulPaint(),
      // 最大内容绘制（LCP）
      lcp: this.getLargestContentfulPaint(),
    }
  }

  /**
   * 获取首次内容绘制时间
   */
  getFirstContentfulPaint(): number | null {
    if (typeof PerformanceObserver === 'undefined') {
      return null
    }

    try {
      const entries = performance.getEntriesByName('first-contentful-paint')
      return entries.length > 0 ? entries[0].startTime : null
    } catch {
      return null
    }
  }

  /**
   * 获取最大内容绘制时间
   */
  getLargestContentfulPaint(): number | null {
    if (typeof PerformanceObserver === 'undefined') {
      return null
    }

    try {
      const entries = performance.getEntriesByType('largest-contentful-paint')
      return entries.length > 0 ? entries[entries.length - 1].startTime : null
    } catch {
      return null
    }
  }

  /**
   * 获取内存使用情况（仅Chrome）
   */
  getMemoryUsage(): MemoryUsage | null {
    if (typeof performance === 'undefined' || !performance.memory) {
      return null
    }

    return {
      // 已用内存（字节）
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      // 总堆大小（字节）
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      // 堆大小限制（字节）
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      // 已用百分比
      usagePercent: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2) + '%',
    }
  }

  /**
   * 获取资源加载时间
   */
  getResourceTiming(): ResourceTiming[] {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return []
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration.toFixed(2),
      size: resource.transferSize || 0,
      cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
    }))
  }

  /**
   * 打印性能报告
   */
  printReport(): void {
    console.group('📊 性能监控报告')

    // 导航时间
    const navTiming = this.getNavigationTiming()
    if (navTiming) {
      console.group('⏱️ 导航时间')
      console.table({
        'DNS查询': navTiming.dns.toFixed(2) + 'ms',
        'TCP连接': navTiming.tcp.toFixed(2) + 'ms',
        '请求时间': navTiming.request.toFixed(2) + 'ms',
        '响应时间': navTiming.response.toFixed(2) + 'ms',
        'DOM解析': navTiming.domParse.toFixed(2) + 'ms',
        'DOM完成': navTiming.domComplete.toFixed(2) + 'ms',
        '页面加载': navTiming.pageLoad.toFixed(2) + 'ms',
        'TTFB': navTiming.ttfb.toFixed(2) + 'ms',
        'FCP': navTiming.fcp ? navTiming.fcp.toFixed(2) + 'ms' : 'N/A',
        'LCP': navTiming.lcp ? navTiming.lcp.toFixed(2) + 'ms' : 'N/A',
      })
      console.groupEnd()
    }

    // 内存使用
    const memory = this.getMemoryUsage()
    if (memory) {
      console.group('💾 内存使用')
      console.table({
        '已用内存': (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        '总堆大小': (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + 'MB',
        '堆大小限制': (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + 'MB',
        '使用百分比': memory.usagePercent,
      })
      console.groupEnd()
    }

    // 自定义标记
    if (Object.keys(this.marks).length > 0) {
      console.group('🔖 自定义标记')
      console.table(this.marks)
      console.groupEnd()
    }

    // 自定义测量
    if (Object.keys(this.measures).length > 0) {
      console.group('📏 自定义测量')
      console.table(this.measures)
      console.groupEnd()
    }

    // 资源加载
    const resources = this.getResourceTiming()
    if (resources.length > 0) {
      console.group('📦 资源加载时间')
      console.table(resources)
      console.groupEnd()
    }

    console.groupEnd()
  }
}

// 创建全局实例
export const perfMonitor = new PerformanceMonitor()

// 开发环境自动输出报告
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      perfMonitor.printReport()
    }, 1000)
  })
}

