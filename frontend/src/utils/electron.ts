/**
 * Electron 环境工具
 */

/** IPC 发送通道 */
export type IpcSendChannel =
  | 'showTodo'
  | 'showEssay'
  | 'showConfig'
  | 'openMenu'
  | 'ballWindowMove'
  | 'updateConfig'
  | 'closeConfig'
  | 'stats-updated'
  | 'todo-reminder'
  | 'show-notification'
  | 'todo-updated'

/** IPC 监听通道 */
export type IpcListenChannel =
  | 'config-updated'
  | 'stats-updated'
  | 'todo-reminder'
  | 'show-notification'
  | 'todo-updated'

// Electron IpcRenderer 类型
interface IpcRenderer {
  send: (channel: string, data?: unknown) => void
  on: (channel: string, callback: (event: unknown, ...args: unknown[]) => void) => void
  once: (channel: string, callback: (event: unknown, ...args: unknown[]) => void) => void
  removeListener: (channel: string, callback: (event: unknown, ...args: unknown[]) => void) => void
  removeAllListeners: (channel: string) => void
  invoke: (channel: string, data?: unknown) => Promise<unknown>
}

/**
 * 检测当前是否在 Electron 环境中运行
 * @returns 是否在 Electron 环境
 */
export const isElectron = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!((window as any).require && (window as any).require('electron'))
  } catch {
    return false
  }
}

/**
 * 获取 ipcRenderer 实例
 * @returns ipcRenderer 实例或 null
 */
const getIpcRenderer = (): IpcRenderer | null => {
  if (!isElectron()) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { ipcRenderer } = (window as any).require('electron')
    return ipcRenderer as IpcRenderer
  } catch (error) {
    console.error('获取 ipcRenderer 失败:', error)
    return null
  }
}

/**
 * 安全发送 IPC 消息
 * @param channel - IPC 通道名称
 * @param data - 要发送的数据
 */
export const sendIpc = (channel: IpcSendChannel, data?: unknown): void => {
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) {
    ipcRenderer.send(channel, data)
  }
}

/**
 * 安全监听 IPC 消息
 * @param channel - IPC 通道名称
 * @param callback - 回调函数
 * @returns 取消监听的函数
 */
export const onIpc = (
  channel: IpcListenChannel,
  callback: (event: unknown, ...args: unknown[]) => void
): (() => void) => {
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) {
    // 包装回调函数
    const wrappedCallback = (event: unknown, ...args: unknown[]): void => callback(event, ...args)
    ipcRenderer.on(channel, wrappedCallback)
    
    // 返回取消监听的函数
    return () => {
      ipcRenderer.removeListener(channel, wrappedCallback)
    }
  }
  // 返回空函数，避免调用时报错
  return () => {}
}

/**
 * 一次性监听 IPC 消息
 * @param channel - IPC 通道名称
 * @param callback - 回调函数
 */
export const onceIpc = (
  channel: IpcListenChannel,
  callback: (event: unknown, ...args: unknown[]) => void
): void => {
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) {
    ipcRenderer.once(channel, callback)
  }
}

/**
 * 移除指定通道的所有监听器
 * @param channel - IPC 通道名称
 */
export const removeAllIpcListeners = (channel: IpcListenChannel): void => {
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) {
    ipcRenderer.removeAllListeners(channel)
  }
}

/**
 * 安全调用 IPC 并等待响应
 * @param channel - IPC 通道名称
 * @param data - 要发送的数据
 * @returns Promise 响应结果
 */
export const invokeIpc = async <T = unknown>(channel: string, data?: unknown): Promise<T | null> => {
  const ipcRenderer = getIpcRenderer()
  if (ipcRenderer) {
    return ipcRenderer.invoke(channel, data) as Promise<T>
  }
  return null
}

