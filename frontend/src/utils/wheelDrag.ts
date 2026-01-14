/**
 * 滚轮拖拽处理工具
 * 用于日期选择器的滚轮列表拖拽交互
 */

/** 拖拽状态 */
interface WheelDragState {
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽起始 Y 坐标 */
  startY: number
  /** 拖拽起始滚动位置 */
  startScrollTop: number
  /** 上一次 Y 坐标 */
  lastY: number
  /** 上一次时间戳 */
  lastTime: number
  /** 鼠标移动事件处理器 */
  mouseMoveHandler: ((event: MouseEvent) => void) | null
  /** 鼠标抬起事件处理器 */
  mouseUpHandler: (() => void) | null
}

/** 拖拽处理器配置选项 */
interface WheelDragHandlerOptions<T extends string = string> {
  /** 列类型标识 */
  type: T
  /** 获取列表元素的函数 */
  getListEl: () => HTMLElement | null
  /** 拖拽开始回调 */
  onDragStart?: (type: T) => void
  /** 拖拽结束回调 */
  onDragEnd?: (type: T, listEl: HTMLElement) => void
}

/** 拖拽处理器返回类型 */
interface WheelDragHandler {
  /** 拖拽状态 */
  state: WheelDragState
  /** 鼠标按下处理 */
  handleMouseDown: (event: MouseEvent) => void
  /** 鼠标移动处理 */
  handleMouseMove: (event: MouseEvent) => void
  /** 鼠标抬起处理 */
  handleMouseUp: () => void
  /** 鼠标离开处理 */
  handleMouseLeave: () => void
  /** 销毁处理器，清理事件监听 */
  dispose: () => void
}

/** 拖拽阈值（像素） */
export const DRAG_THRESHOLD = 1

/**
 * 创建滚轮拖拽处理器
 * @param options - 配置选项
 * @returns 拖拽处理器
 */
export function createWheelDragHandler<T extends string = string>(options: WheelDragHandlerOptions<T>): WheelDragHandler {
  const { type, getListEl, onDragStart, onDragEnd } = options

  // 拖拽状态
  const state: WheelDragState = {
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
    lastY: 0,
    lastTime: 0,
    mouseMoveHandler: null,
    mouseUpHandler: null
  }

  /**
   * 处理全局鼠标移动
   */
  const handleGlobalMouseMove = (event: MouseEvent): void => {
    if (state.startY === 0) return
    const listEl = getListEl()
    if (!listEl) return

    const deltaY = event.clientY - state.startY

    if (Math.abs(deltaY) > DRAG_THRESHOLD) {
      if (!state.isDragging) {
        state.isDragging = true
        listEl.style.scrollBehavior = 'auto'
        onDragStart?.(type)
      }
      const newScrollTop = state.startScrollTop - deltaY
      const maxScrollTop = listEl.scrollHeight - listEl.clientHeight
      listEl.scrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop))
      state.lastY = event.clientY
      state.lastTime = Date.now()
    }
  }

  /**
   * 清理全局事件监听器
   */
  const cleanupGlobalListeners = (): void => {
    if (state.mouseMoveHandler) {
      document.removeEventListener('mousemove', state.mouseMoveHandler)
      state.mouseMoveHandler = null
    }
    if (state.mouseUpHandler) {
      document.removeEventListener('mouseup', state.mouseUpHandler)
      state.mouseUpHandler = null
    }
  }

  /**
   * 重置拖拽状态
   */
  const resetState = (): void => {
    state.isDragging = false
    state.startY = 0
    state.startScrollTop = 0
    state.lastY = 0
    state.lastTime = 0
  }

  /**
   * 处理全局鼠标抬起
   */
  const handleGlobalMouseUp = (): void => {
    const listEl = getListEl()
    if (listEl) {
      listEl.style.cursor = ''
      listEl.style.userSelect = ''
      listEl.style.scrollBehavior = ''
    }

    cleanupGlobalListeners()

    if (state.isDragging && listEl) {
      onDragEnd?.(type, listEl)
    }

    resetState()
  }

  /**
   * 处理鼠标按下
   */
  const handleMouseDown = (event: MouseEvent): void => {
    const listEl = getListEl()
    if (!listEl) return

    state.isDragging = false
    state.startY = event.clientY
    state.startScrollTop = listEl.scrollTop
    state.lastY = event.clientY
    state.lastTime = Date.now()
    listEl.style.cursor = 'grabbing'
    listEl.style.userSelect = 'none'
    listEl.style.scrollBehavior = 'auto'

    state.mouseMoveHandler = (e: MouseEvent): void => handleGlobalMouseMove(e)
    state.mouseUpHandler = (): void => handleGlobalMouseUp()
    document.addEventListener('mousemove', state.mouseMoveHandler, { passive: false })
    document.addEventListener('mouseup', state.mouseUpHandler)

    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * 销毁处理器
   */
  const dispose = (): void => {
    cleanupGlobalListeners()
  }

  return {
    state,
    handleMouseDown,
    handleMouseMove: (event: MouseEvent): void => handleGlobalMouseMove(event),
    handleMouseUp: (): void => handleGlobalMouseUp(),
    handleMouseLeave: (): void => {},
    dispose
  }
}

