<template>
  <div class="container" :class="count[0] ? 'hasOverdue' : 'allPending'" @mouseup="handleMouseUp" @mousedown="handleMouseDown" @mouseenter="showMore" @mouseleave="hideMore">
    <transition name="fade">
      <div v-if="isNotMore" class="main-container" :class="{ 'blinking': isBlinking }" :style="{opacity: opacity, backgroundColor: mainColor}" @click="handleMainClick">
        <div class="progress" :style="{ width: progress }"></div>
        <div class="text">
          <span v-if="count[0]">{{count[0]}}&nbsp;&nbsp;:&nbsp;&nbsp;</span>
          {{count[1]}}
        </div>
      </div>
      <div v-else class="son-container">
        <div v-if="hoverFeatures.includes('todo')" class="son-item" :style="{'background-color': mainColor}" @click="showTodo">
          <span>📝</span>
        </div>
        <div v-if="hoverFeatures.includes('essay')" class="son-item" :style="{'background-color': mainColor}" @click="showEssay">
          <span>✍️</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getCache, setCache } from '../utils/apiCache'
import { sendIpc, onIpc } from '../utils/electron'
import { useApi } from '../composables/useApi'
import type { AppConfig } from '../types/api'

/** Todo 统计数据类型 */
interface TodoStats {
  overdue: number
  pending: number
}

export default {
  name: 'FloatBall',
  setup() {
    const { get } = useApi()
    
    const isNotMore = ref(true)
    const count = ref([0, 0])
    const opacity = ref(0.8)
    const mainColor = ref('#49ce95')
    const hoverFeatures = ref<string[]>(['todo', 'essay'])
    const isBlinking = ref(false)

    let biasX = 0
    let biasY = 0
    const moveS = [0, 0, 0, 0]
    let isDragging = false
    
    // IPC 监听器清理函数
    let removeConfigListener: (() => void) | null = null
    let removeStatsListener: (() => void) | null = null
    let removeReminderListener: (() => void) | null = null
    let blinkTimer: ReturnType<typeof setTimeout> | null = null

    const progress = computed(() => {
      if (count.value[1] === 0) return '0%'
      const percent = Math.floor((count.value[0] * 100) / (count.value[1]))
      return `${percent}%`
    })

    const applyConfig = (config: Partial<AppConfig> | null = {}) => {
      if (!config) return
      opacity.value = config.opacity ?? opacity.value
      mainColor.value = config.mainColor ?? mainColor.value
      if (Array.isArray(config.hoverFeatures) && config.hoverFeatures.length > 0) {
        hoverFeatures.value = config.hoverFeatures
      }
    }

    const loadStats = async () => {
      try {
        // 先检查缓存
        const cached = getCache<TodoStats>('/todo/stats', {}, Number.MAX_SAFE_INTEGER)
        if (cached) {
          count.value = [cached.overdue || 0, cached.pending || 0]
        }
        
        // 请求最新数据
        const response = await get<TodoStats>('/todo/stats', { showLoading: false, showError: false })
        const stats = {
          overdue: response.data.overdue || 0,
          pending: response.data.pending || 0
        }
        count.value = [stats.overdue, stats.pending]
        // 更新缓存
        setCache('/todo/stats', {}, stats, Number.MAX_SAFE_INTEGER)
      } catch (error) {
        console.error('加载统计失败:', error)
        // 如果请求失败，尝试使用缓存
        const expiredCache = getCache<TodoStats>('/todo/stats', {}, Number.MAX_SAFE_INTEGER)
        if (expiredCache) {
          count.value = [expiredCache.overdue || 0, expiredCache.pending || 0]
        }
      }
    }

    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return
      sendIpc('ballWindowMove', { x: e.screenX - biasX, y: e.screenY - biasY })
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        sendIpc('openMenu')
        return
      }
      isDragging = true
      biasX = e.clientX
      biasY = e.clientY
      moveS[0] = e.screenX - biasX
      moveS[1] = e.screenY - biasY
      document.addEventListener('mousemove', handleMove)
    }

    const handleMouseUp = (e: MouseEvent) => {
      isDragging = false
      moveS[2] = e.screenX - biasX
      moveS[3] = e.screenY - biasY
      document.removeEventListener('mousemove', handleMove)
    }

    const showMore = () => {
      if (isDragging) return
      if (hoverFeatures.value.length === 1) return
      isNotMore.value = false
    }

    const hideMore = () => {
      if (isDragging) return
      if (hoverFeatures.value.length === 1) return
      isNotMore.value = true
    }

    const calcS = () => {
      const res = Math.pow(moveS[0] - moveS[2], 2) + Math.pow(moveS[1] - moveS[3], 2)
      return res < 5
    }

    const showTodo = () => {
      if (!calcS()) return
      sendIpc('showTodo')
    }

    const showEssay = () => {
      if (!calcS()) return
      sendIpc('showEssay')
    }

    const handleMainClick = () => {
      if (hoverFeatures.value.length === 1) {
        if (!calcS()) return
        const feature = hoverFeatures.value[0]
        if (feature === 'todo') {
          showTodo()
        } else if (feature === 'essay') {
          showEssay()
        }
      }
    }

    // 触发闪烁动画（5秒）
    const startBlink = () => {
      // 如果已经在闪烁，先清除之前的定时器
      if (blinkTimer) {
        clearTimeout(blinkTimer)
      }
      
      isBlinking.value = true
      
      // 5秒后停止闪烁
      blinkTimer = setTimeout(() => {
        isBlinking.value = false
        blinkTimer = null
      }, 5000)
    }

    onMounted(() => {
      // 加载本地配置
      const storage = localStorage.getItem('hijot-config')
      if (storage) {
        try {
          const config = JSON.parse(storage)
          applyConfig(config)
        } catch (e) {
          console.warn('解析配置失败:', e)
        }
      }
      
      // 监听配置更新
      removeConfigListener = onIpc('config-updated', (_event, config) => {
        if (config) {
          localStorage.setItem('hijot-config', JSON.stringify(config))
          applyConfig(config)
        }
      })

      // 监听统计更新事件，收到事件后刷新统计数据
      removeStatsListener = onIpc('stats-updated', () => {
        loadStats()
      })

      // 监听待办提醒事件
      removeReminderListener = onIpc('todo-reminder', () => {
        startBlink()
      })
      
      // 加载统计数据
      loadStats()
    })

    onBeforeUnmount(() => {
      // 移除 IPC 监听器
      if (removeConfigListener) {
        removeConfigListener()
        removeConfigListener = null
      }
      if (removeStatsListener) {
        removeStatsListener()
        removeStatsListener = null
      }
      if (removeReminderListener) {
        removeReminderListener()
        removeReminderListener = null
      }
      
      // 清除闪烁定时器
      if (blinkTimer) {
        clearTimeout(blinkTimer)
        blinkTimer = null
      }
      
      // 移除鼠标移动监听
      document.removeEventListener('mousemove', handleMove)
    })

    return {
      isNotMore,
      count,
      opacity,
      mainColor,
      hoverFeatures,
      progress,
      isBlinking,
      handleMouseDown,
      handleMouseUp,
      showMore,
      hideMore,
      showTodo,
      showEssay,
      handleMainClick
    }
  }
}
</script>

<style scoped lang="scss">
* {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.container {
  height: 36px;
  width: 70px;
  &.hasOverdue{
    height: 36px;
    width: 70px;
  }
  &.allPending{
    height: 36px;
    width: 60px;
  }
}



.main-container {
  height: 100%;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border: 3px solid #333;
  box-sizing: border-box;
}

.text {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: bold;
  color: #000;
  z-index: 2;
  position: relative;
}

.progress {
  position: absolute;
  left: 0px;
  top: 0px;
  height: 100%;
  width: 0;
  background-color: rgba(255, 0, 0, 0.7);
  transition: width 0.3s;
  z-index: 1;
  border-radius: 18px;
}

.son-container {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: 12px;
}

.son-item {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.son-item span {
  font-size: 12px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.son-item:hover {
  transform: scale(1.2);
  transition: transform 0.3s;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.blinking {
  animation: border-color-cycle 1.5s linear infinite;
}

@keyframes border-color-cycle {
  0% {
    border-color: #ff6b6b;
  }
  25% {
    border-color: #feca57;
  }
  50% {
    border-color: #48dbfb;
  }
  75% {
    border-color: #ff9ff3;
  }
  100% {
    border-color: #ff6b6b;
  }
}
</style>
