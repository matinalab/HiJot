/**
 * 待办提醒组合式函数
 * 管理待办事项的提醒逻辑，包括过期检测、定时提醒、系统通知等
 */

import { ref, computed } from 'vue'
import { sendIpc, onIpc } from '../utils/electron'
import { useApi } from './useApi'
import { getCache } from '../utils/apiCache'
import type { Todo } from '../types/api'

/** useTodoReminder 返回类型 */
export interface UseTodoReminderReturn {
  /** 初始化提醒服务 */
  init: () => void
  /** 清理提醒服务 */
  cleanup: () => void
  /** 重新设置下一个未过期任务的定时器 */
  scheduleNextReminder: () => void
}

/**
 * 待办提醒组合式函数
 * @returns 提醒相关的方法
 */
export function useTodoReminder(): UseTodoReminderReturn {
  // 内部维护的 todo 数据
  const globalTodos = ref<Todo[]>([])
  
  // 创建内部的 todoList（只包含未完成的任务）
  const internalTodoList = computed(() => globalTodos.value.filter(item => item.status === 0))
  
  // 提醒定时器
  let reminderTimer: ReturnType<typeof setTimeout> | null = null
  // 本地缓存的已提醒任务ID集合（作为后端请求失败的降级方案）
  const localRemindedIds = new Set<number>()
  // 系统通知开关状态
  const systemNotificationEnabled = ref(false)
  // 配置监听器清理函数
  let removeConfigListener: (() => void) | null = null
  // 数据更新监听器清理函数
  let removeDataUpdateListener: (() => void) | null = null
  // 每秒检查过期任务的定时器
  let checkTimer: ReturnType<typeof setInterval> | null = null
  
  // API 实例
  const api = useApi()
  
  /**
   * 从本地存储加载已提醒的任务ID列表
   */
  const loadLocalRemindedIds = () => {
    try {
      const stored = localStorage.getItem('hijot-reminded-ids')
      if (stored) {
        const ids = JSON.parse(stored) as number[]
        ids.forEach(id => localRemindedIds.add(id))
      }
    } catch (error) {
      console.warn('加载本地已提醒ID列表失败:', error)
    }
  }
  
  /**
   * 保存已提醒的任务ID到本地存储
   */
  const saveLocalRemindedIds = () => {
    try {
      const ids = Array.from(localRemindedIds)
      localStorage.setItem('hijot-reminded-ids', JSON.stringify(ids))
    } catch (error) {
      console.warn('保存本地已提醒ID列表失败:', error)
    }
  }
  
  /**
   * 标记任务为已提醒（更新后端和本地缓存）
   */
  const markAsReminded = async (todoId: number) => {
    // 先更新本地缓存
    localRemindedIds.add(todoId)
    saveLocalRemindedIds()
    
    // 尝试更新后端
    try {
      await api.patch(`/todo/${todoId}`, { isReminded: true }, { 
        showLoading: false, 
        showError: false 
      })
    } catch (error) {
      console.warn(`标记任务 ${todoId} 为已提醒失败:`, error)
      // 后端更新失败不影响，本地已缓存
    }
  }
  
  /**
   * 检查任务是否已提醒过（优先使用后端字段，降级使用本地缓存）
   */
  const isTodoReminded = (todo: Todo): boolean => {
    // 优先使用后端字段
    if (todo.isReminded === true) {
      return true
    }
    // 降级使用本地缓存
    if (localRemindedIds.has(todo.id)) {
      return true
    }
    return false
  }

  /**
   * 应用配置
   * @param config - 配置对象
   */
  const applyConfig = (config: Record<string, unknown> | null) => {
    if (!config) return
    const enabled = Boolean((config as { systemNotification?: boolean }).systemNotification)
    systemNotificationEnabled.value = enabled
  }

  /**
   * 获取待办列表
   */
  const fetchTodos = async () => {
    try {
      const todoCacheKey = '/todo/all'
      
      // 检查缓存，如果有缓存立即显示
      const cachedAll = getCache<Todo[]>(todoCacheKey, {}, 2 * 60 * 1000)
      if (cachedAll) {
        globalTodos.value = cachedAll.filter(item => item.status === 0 || item.status === 1)
        // 使用缓存数据时也设置定时器
        scheduleNextReminder()
      }
      
      // 从 API 获取最新数据
      const response = await api.get<Todo[]>('/todo', { showLoading: false, showError: false })
      globalTodos.value = response.data.filter(item => item.status === 0 || item.status === 1)
      
      // 获取列表后设置定时器
      scheduleNextReminder()
    } catch (error) {
      console.error('获取待办列表失败:', error)
      // 如果请求失败，尝试使用过期缓存
      const cachedAll = getCache<Todo[]>('/todo/all', {}, 10 * 60 * 1000)
      if (cachedAll) {
        globalTodos.value = cachedAll.filter(item => item.status === 0 || item.status === 1)
        scheduleNextReminder()
      }
    }
  }

  /**
   * 检测到期的任务并发送提醒
   */
  const checkUpcomingTodos = () => {
    const currentTime = Date.now()

    // 检查是否有待办任务已到期
    const overdueTodos = internalTodoList.value.filter(
      todo => todo.status === 0 && todo.endTime <= currentTime
    )
    
    // 找出新过期的任务（之前没有提醒过的）
    const newOverdueTodos = overdueTodos.filter(
      todo => !isTodoReminded(todo)
    )
    
    // 只有当有新过期的任务时才触发闪烁
    if (newOverdueTodos.length > 0) {
      // 标记这些任务为已提醒（更新后端和本地缓存）
      newOverdueTodos.forEach(todo => {
        markAsReminded(todo.id)
      })
      // 发送提醒事件（触发悬浮球闪烁）
      sendIpc('todo-reminder')
      // 发送统计更新事件（通知悬浮球刷新统计数据）
      sendIpc('stats-updated')
      // 重新设置提醒定时器（因为可能有新的任务需要提醒）
      scheduleNextReminder()
    }
    
    // 清理已完成或已删除的任务ID（避免内存泄漏）
    const currentTodoIds = new Set(internalTodoList.value.map(t => t.id))
    localRemindedIds.forEach(id => {
      if (!currentTodoIds.has(id)) {
        localRemindedIds.delete(id)
      }
    })
    // 如果本地缓存有变化，保存到本地存储
    if (localRemindedIds.size > 0) {
      saveLocalRemindedIds()
    }
  }

  /**
   * 设置基于下一个未过期任务的定时器
   */
  const scheduleNextReminder = () => {
    // 清除之前的定时器
    if (reminderTimer) {
      clearTimeout(reminderTimer)
      reminderTimer = null
    }

    const currentTime = Date.now()
    // 找到所有未完成的待办任务
    const pendingTodos = internalTodoList.value.filter(todo => todo.status === 0)
    
    if (pendingTodos.length === 0) {
      // 没有待办任务，不需要设置定时器
      return
    }

    // 找到下一个未过期的任务（即最早要到期的任务）
    const futureTodos = pendingTodos
      .filter(todo => todo.endTime > currentTime)
      .sort((a, b) => a.endTime - b.endTime) // 按到期时间升序排序
    
    if (futureTodos.length === 0) {
      // 没有即将到期的任务，不设置定时器，不闪烁
      return
    }

    // 设置定时器，在最早的任务到期时触发
    const nextTodo = futureTodos[0]
    const timeUntilDue = nextTodo.endTime - currentTime
    
    if (timeUntilDue > 0) {
      reminderTimer = setTimeout(() => {
        // 任务到期，触发提醒
        // 标记任务为已提醒（更新后端和本地缓存）
        markAsReminded(nextTodo.id)
        sendIpc('todo-reminder')
        // 发送统计更新事件（通知悬浮球刷新统计数据）
        sendIpc('stats-updated')
        // 发送系统通知，显示这条刚到期的任务内容
        if (systemNotificationEnabled.value) {
          sendIpc('show-notification', {
            title: '⏰ 待办提醒',
            content: nextTodo.content
          })
        }
        // 重新设置下一个未过期任务的定时器
        scheduleNextReminder()
      }, timeUntilDue)
    }
  }

  /**
   * 初始化提醒服务
   */
  const initialize = () => {
    // 加载本地已提醒的任务ID列表
    loadLocalRemindedIds()
    
    // 读取本地配置中的系统提醒开关
    try {
      const storage = localStorage.getItem('hijot-config')
      if (storage) {
        applyConfig(JSON.parse(storage))
      }
    } catch (error) {
      console.warn('加载本地配置失败:', error)
    }

    // 监听配置更新
    removeConfigListener = onIpc('config-updated', (_event, config) => {
      if (config) {
        localStorage.setItem('hijot-config', JSON.stringify(config))
        applyConfig(config as Record<string, unknown>)
      }
    })

    // 监听数据更新事件（当 Todo 列表发生改时触发）
    removeDataUpdateListener = onIpc('todo-updated', () => {
      // 立即重新获取数据并更新提醒定时器
      fetchTodos()
    })

    // 首次获取数据
    fetchTodos()

    // 首次挂载时检测一次
    checkUpcomingTodos()
    
    // 每秒检测一次过期任务
    checkTimer = setInterval(() => {
      checkUpcomingTodos()
    }, 1000)

    // 初始设置定时器
    scheduleNextReminder()
  }

  /**
   * 清理提醒服务
   */
  const cleanupResources = () => {
    // 清除提醒定时器
    if (reminderTimer) {
      clearTimeout(reminderTimer)
      reminderTimer = null
    }
    // 清除检查定时器
    if (checkTimer) {
      clearInterval(checkTimer)
      checkTimer = null
    }
    // 移除配置监听器
    if (removeConfigListener) {
      removeConfigListener()
      removeConfigListener = null
    }
    // 移除数据更新监听器
    if (removeDataUpdateListener) {
      removeDataUpdateListener()
      removeDataUpdateListener = null
    }
  }

  // 返回 init 和 cleanup 方法
  return {
    init: initialize,
    cleanup: cleanupResources,
    scheduleNextReminder
  }
}
