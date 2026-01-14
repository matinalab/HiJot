/**
 * 启动优化工具
 * 优化应用启动时间和初始化流程
 */

import { perfMonitor } from './performance'

/** 懒加载组件配置 */
interface LazyLoadConfig {
  component: () => Promise<unknown>
  loading: null
  error: null
  delay: number
  timeout: number
}

/** 任务调度器配置 */
interface TaskSchedulerOptions {
  batchSize?: number
  delay?: number
}

/** 内存优化器配置 */
interface MemoryOptimizerOptions {
  checkInterval?: number
  threshold?: number
}

/** 虚拟滚动配置 */
interface VirtualScrollerOptions {
  itemHeight?: number
  bufferSize?: number
}

/**
 * 懒加载组件
 * 用于按需加载组件，减少初始加载时间
 */
export function lazyLoadComponent(importFunc: () => Promise<unknown>): LazyLoadConfig {
  return {
    component: importFunc,
    loading: null,
    error: null,
    delay: 200,
    timeout: 10000,
  }
}

/**
 * 延迟执行任务
 * 用于将非关键任务延迟到空闲时间执行
 */
export function scheduleTask(callback: () => void, delay: number = 0): void {
  if (typeof requestIdleCallback !== 'undefined') {
    // 优先使用 requestIdleCallback（浏览器空闲时执行）
    requestIdleCallback(callback, { timeout: delay })
  } else if (typeof requestAnimationFrame !== 'undefined') {
    // 降级到 requestAnimationFrame
    requestAnimationFrame(callback)
  } else {
    // 最后降级到 setTimeout
    setTimeout(callback, delay)
  }
}

/**
 * 批量任务调度器
 * 用于分批执行任务，避免阻塞主线程
 */
export class TaskScheduler {
  private tasks: Array<() => void | Promise<void>> = []
  private running: boolean = false
  private batchSize: number
  private delay: number

  constructor(options: TaskSchedulerOptions = {}) {
    this.batchSize = options.batchSize || 5
    this.delay = options.delay || 0
  }

  /**
   * 添加任务
   */
  addTask(task: () => void | Promise<void>): void {
    this.tasks.push(task)
  }

  /**
   * 添加多个任务
   */
  addTasks(tasks: Array<() => void | Promise<void>>): void {
    this.tasks.push(...tasks)
  }

  /**
   * 执行所有任务
   */
  async run(): Promise<void> {
    if (this.running) return

    this.running = true
    perfMonitor.mark('task-scheduler-start')

    try {
      for (let i = 0; i < this.tasks.length; i += this.batchSize) {
        const batch = this.tasks.slice(i, i + this.batchSize)
        
        // 并行执行批次中的任务
        await Promise.all(batch.map(task => {
          try {
            return Promise.resolve(task())
          } catch (error) {
            console.error('任务执行错误:', error)
            return Promise.reject(error)
          }
        }))

        // 批次之间的延迟
        if (this.delay > 0 && i + this.batchSize < this.tasks.length) {
          await new Promise(resolve => setTimeout(resolve, this.delay))
        }
      }
    } finally {
      this.running = false
      perfMonitor.mark('task-scheduler-end')
      perfMonitor.measure('task-scheduler', 'task-scheduler-start', 'task-scheduler-end')
    }
  }

  /**
   * 清空任务队列
   */
  clear(): void {
    this.tasks = []
  }
}

/**
 * 初始化优化
 * 优化应用初始化流程
 */
export function optimizeInitialization(): void {
  perfMonitor.mark('app-init-start')

  // 1. 预加载关键资源
  preloadCriticalResources()

  // 2. 延迟加载非关键资源
  scheduleTask(() => {
    preloadNonCriticalResources()
  }, 1000)

  // 3. 初始化分析和监控
  scheduleTask(() => {
    initializeAnalytics()
  }, 2000)

  perfMonitor.mark('app-init-end')
  perfMonitor.measure('app-initialization', 'app-init-start', 'app-init-end')
}

/**
 * 预加载关键资源
 */
function preloadCriticalResources(): void {
  // 预加载关键字体
  // preloadFont('/fonts/system.woff2', 'font/woff2')
  
  // 预连接到API服务器（使用本地开发服务器地址）
  preconnectTo('http://localhost:3000')
}

/**
 * 预加载非关键资源
 */
function preloadNonCriticalResources(): void {
  // 预加载次要字体
  preloadFont('/fonts/secondary.woff2', 'font/woff2')
  
  // 预加载图片
  preloadImage('/images/logo.png')
}

/**
 * 预加载字体
 */
function preloadFont(href: string, type: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'font'
  link.type = type
  link.href = href
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

/**
 * 预加载图片
 */
function preloadImage(src: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)
}

/**
 * 预连接到服务器
 */
function preconnectTo(origin: string): void {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = origin
  document.head.appendChild(link)
}

/**
 * 初始化分析
 */
function initializeAnalytics(): void {
  // 这里可以初始化分析工具
  console.log('分析工具已初始化')
}

/**
 * 内存优化
 * 定期清理不需要的资源
 */
export class MemoryOptimizer {
  private checkInterval: number
  private threshold: number
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(options: MemoryOptimizerOptions = {}) {
    this.checkInterval = options.checkInterval || 30000 // 30秒
    this.threshold = options.threshold || 0.9 // 90%
  }

  /**
   * 启动内存监控
   */
  start(): void {
    this.timer = setInterval(() => {
      this.checkMemory()
    }, this.checkInterval)
  }

  /**
   * 停止内存监控
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 检查内存使用
   */
  checkMemory(): void {
    const memory = perfMonitor.getMemoryUsage()
    if (!memory) return

    const usagePercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit

    if (usagePercent > this.threshold) {
      console.warn(`⚠️ 内存使用过高: ${(usagePercent * 100).toFixed(2)}%`)
      this.cleanup()
    }
  }

  /**
   * 清理内存
   */
  cleanup(): void {
    // 强制垃圾回收（如果可用）
    if (window.gc) {
      window.gc()
      console.log('✅ 垃圾回收已执行')
    }

    // 清理缓存
    this.clearCache()
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    // 这里可以清理应用级别的缓存
    console.log('缓存已清理')
  }
}

/**
 * 防抖函数
 * 用于减少频繁事件的处理次数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return function executedFunction(...args: Parameters<T>): void {
    const later = (): void => {
      timeout = null
      func(...args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * 用于限制函数执行频率
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return function(this: unknown, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 虚拟滚动优化
 * 用于大列表渲染优化
 */
export class VirtualScroller<T> {
  private container: HTMLElement
  private itemHeight: number
  private bufferSize: number
  private items: T[] = []
  private visibleItems: T[] = []

  constructor(container: HTMLElement, options: VirtualScrollerOptions = {}) {
    this.container = container
    this.itemHeight = options.itemHeight || 50
    this.bufferSize = options.bufferSize || 5
  }

  /**
   * 设置数据
   */
  setItems(items: T[]): void {
    this.items = items
    this.updateVisibleItems()
  }

  /**
   * 更新可见项
   */
  updateVisibleItems(): void {
    const scrollTop = this.container.scrollTop
    const containerHeight = this.container.clientHeight

    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize)
    const endIndex = Math.min(
      this.items.length,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferSize
    )

    this.visibleItems = this.items.slice(startIndex, endIndex)
  }

  /**
   * 获取可见项
   */
  getVisibleItems(): T[] {
    return this.visibleItems
  }
}

