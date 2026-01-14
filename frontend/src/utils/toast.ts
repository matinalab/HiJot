/**
 * Toast 提示工具
 * 轻量级消息提示，替代 alert
 */

/** Toast 类型 */
type ToastType = 'success' | 'error' | 'warning' | 'info'

/** Toast 样式配置 */
interface ToastStyle {
  background: string
  color: string
  icon: string
}

// Toast 容器 ID
const TOAST_CONTAINER_ID = 'hijot-toast-container'

// Toast 类型对应的样式
const TOAST_STYLES: Record<ToastType, ToastStyle> = {
  success: {
    background: '#49ce95',
    color: '#fff',
    icon: '✓'
  },
  error: {
    background: '#ff4d4f',
    color: '#fff',
    icon: '✕'
  },
  warning: {
    background: '#faad14',
    color: '#fff',
    icon: '!'
  },
  info: {
    background: '#1890ff',
    color: '#fff',
    icon: 'i'
  }
}

/**
 * 获取或创建 Toast 容器
 * @returns Toast 容器元素
 */
function getToastContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID)
  
  if (!container) {
    container = document.createElement('div')
    container.id = TOAST_CONTAINER_ID
    container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `
    document.body.appendChild(container)
  }
  
  return container
}

/**
 * 创建 Toast 元素
 * @param message - 消息内容
 * @param type - 消息类型
 * @returns Toast 元素
 */
function createToastElement(message: string, type: ToastType): HTMLElement {
  const style = TOAST_STYLES[type] || TOAST_STYLES.info
  
  const toast = document.createElement('div')
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: ${style.background};
    color: ${style.color};
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    pointer-events: auto;
    max-width: 300px;
    word-break: break-word;
  `
  
  // 图标
  const icon = document.createElement('span')
  icon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-size: 11px;
    font-weight: bold;
    flex-shrink: 0;
  `
  icon.textContent = style.icon
  
  // 消息文本
  const text = document.createElement('span')
  text.textContent = message
  
  toast.appendChild(icon)
  toast.appendChild(text)
  
  return toast
}

/**
 * 显示 Toast 提示
 * @param message - 消息内容
 * @param type - 消息类型：success | error | warning | info
 * @param duration - 显示时长（毫秒），默认 2000
 */
export function showToast(message: string, type: ToastType = 'info', duration: number = 2000): void {
  const container = getToastContainer()
  const toast = createToastElement(message, type)
  
  container.appendChild(toast)
  
  // 触发动画
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })
  
  // 自动移除
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-10px)'
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }, duration)
}

/**
 * 显示成功提示
 * @param message - 消息内容
 * @param duration - 显示时长
 */
export function showSuccess(message: string, duration?: number): void {
  showToast(message, 'success', duration)
}

/**
 * 显示错误提示
 * @param message - 消息内容
 * @param duration - 显示时长
 */
export function showError(message: string, duration?: number): void {
  showToast(message, 'error', duration)
}

/**
 * 显示警告提示
 * @param message - 消息内容
 * @param duration - 显示时长
 */
export function showWarning(message: string, duration?: number): void {
  showToast(message, 'warning', duration)
}

/**
 * 显示信息提示
 * @param message - 消息内容
 * @param duration - 显示时长
 */
export function showInfo(message: string, duration?: number): void {
  showToast(message, 'info', duration)
}

