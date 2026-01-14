/**
 * Preload 脚本
 * 在渲染进程加载前执行，用于安全地暴露 Node.js/Electron API
 * 
 * 注意：当前项目使用 nodeIntegration: true，此文件作为未来安全升级的准备
 * 建议未来启用 contextIsolation: true 并使用此 preload 脚本
 */

const { contextBridge, ipcRenderer } = require('electron')

// 安全暴露的 API
const electronAPI = {
  // 发送 IPC 消息
  send: (channel, data) => {
    // 白名单通道
    const validChannels = [
      'showTodo',
      'showEssay',
      'showConfig',
      'openMenu',
      'ballWindowMove',
      'updateConfig',
      'closeConfig',
      'stats-updated',
      'todo-reminder',
      'todo-updated',
      'show-notification',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // 监听 IPC 消息
  on: (channel, callback) => {
    const validChannels = [
      'config-updated',
      'stats-updated',
      'todo-reminder',
      'show-notification',
      'todo-updated',
    ]
    if (validChannels.includes(channel)) {
      // 包装回调以移除 event 对象（安全考虑）
      const subscription = (_event, ...args) => callback(...args)
      ipcRenderer.on(channel, subscription)
      
      // 返回取消订阅函数
      return () => {
        ipcRenderer.removeListener(channel, subscription)
      }
    }
    return () => {}
  },

  // 一次性监听
  once: (channel, callback) => {
    const validChannels = [
      'config-updated',
      'stats-updated',
      'todo-reminder',
      'show-notification',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args))
    }
  },

  // 移除所有监听器
  removeAllListeners: (channel) => {
    const validChannels = [
      'config-updated',
      'stats-updated',
      'todo-reminder',
      'show-notification',
      'todo-updated',
    ]
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  },

  // 调用并等待响应
  invoke: async (channel, data) => {
    const validChannels = [
      'get-config',
      'save-config',
    ]
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data)
    }
    return null
  }
}

// 当 contextIsolation 启用时，使用 contextBridge 暴露 API
// 目前项目使用 nodeIntegration: true，所以这段代码暂时不会执行
try {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } else {
    // 兼容模式：直接挂载到 window
    window.electronAPI = electronAPI
  }
} catch (error) {
  console.error('Preload 脚本初始化失败:', error)
}

// 导出供直接引用（当 nodeIntegration: true 时）
module.exports = electronAPI
