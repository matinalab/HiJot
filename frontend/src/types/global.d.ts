/**
 * 全局类型扩展
 */

import type { AxiosInstance } from 'axios'
import type { IpcSendChannel, IpcListenChannel } from '../utils/electron'

// ============================================
// Vue 扩展类型
// ============================================

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: AxiosInstance
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $api: AxiosInstance
  }
}

// ============================================
// 全局类型扩展
// ============================================

declare global {
  interface Window {
    gc?: () => void
    electronAPI?: {
      send: (channel: IpcSendChannel, data?: unknown) => void
      on: (channel: IpcListenChannel, callback: (...args: unknown[]) => void) => () => void
      once: (channel: IpcListenChannel, callback: (...args: unknown[]) => void) => void
      removeAllListeners: (channel: IpcListenChannel) => void
      invoke: (channel: string, data?: unknown) => Promise<unknown>
    }
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }
}

export {}

