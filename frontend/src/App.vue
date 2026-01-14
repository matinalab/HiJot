<template>
  <div id="app">
    <component :is="currentView" />
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import './css/common.scss'
import './css/components.scss'
import FloatBall from './views/FloatBall.vue'
import Todo from './views/Todo.vue'
import Essay from './views/Essay.vue'
import Config from './views/Config.vue'
import { perfMonitor } from './utils/performance'
import { optimizeInitialization, MemoryOptimizer } from './utils/startup'
import { useTodoReminder } from './composables/useTodoReminder'

// 视图映射
const VIEW_MAP: Record<string, string> = {
  todo: 'Todo',
  essay: 'Essay',
  config: 'Config',
}

export default {
  name: 'App',
  components: {
    FloatBall,
    Todo,
    Essay,
    Config
  },
  setup() {
    const currentView = ref('FloatBall')
    let memoryOptimizer: MemoryOptimizer | null = null
    // 使用提醒服务
    const reminderService = useTodoReminder()
    const { init: initTodoReminder, cleanup: cleanupTodoReminder } = reminderService

    // 根据 hash 获取视图名称
    const getViewFromHash = (hash: string): string => {
      const key = hash.slice(1) // 移除 #
      return VIEW_MAP[key] || 'FloatBall'
    }

    // 处理 hash 变化
    const handleHashChange = () => {
      currentView.value = getViewFromHash(window.location.hash)
    }

    onMounted(() => {
      // 标记应用挂载
      perfMonitor.mark('app-mounted')

      // 根据 URL hash 决定显示哪个组件
      currentView.value = getViewFromHash(window.location.hash)

      // 初始化优化
      optimizeInitialization()

      // 启动内存监控（仅开发环境）
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      if (import.meta.env.DEV) {
        memoryOptimizer = new MemoryOptimizer({
          checkInterval: 30000,
          threshold: 0.85,
        })
        memoryOptimizer.start()
      }

      // 监听 hash 变化
      window.addEventListener('hashchange', handleHashChange)

      // 只在 FloatBall 窗口初始化 Todo 提醒服务（避免多个窗口重复初始化导致重复提醒）
      if (currentView.value === 'FloatBall') {
        initTodoReminder()
      }
    })

    onUnmounted(() => {
      // 清理事件监听
      window.removeEventListener('hashchange', handleHashChange)
      
      // 停止内存监控
      if (memoryOptimizer) {
        memoryOptimizer.stop()
        memoryOptimizer = null
      }

      // 只在 FloatBall 窗口清理 Todo 提醒服务
      if (currentView.value === 'FloatBall') {
        cleanupTodoReminder()
      }
    })

    return {
      currentView
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

/* 全局细滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(245, 247, 250);
}

::-webkit-scrollbar-thumb {
  background: rgba(144, 147, 153, 0.4);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(144, 147, 153, 0.6);
}

</style>
