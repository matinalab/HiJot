<template>
  <div class="container" :style="cssVars">
    <div class="list-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <template v-else>
        <!-- 待完成列表 -->
        <div class="todo-list">
          <div class="list-title">待完成</div>
          
          <!-- 空状态 -->
          <div v-if="todoList.length === 0" class="empty-container">
            <div class="empty-icon">📝</div>
            <div class="empty-text">暂无待办事项</div>
          </div>

          <div class="todo-item" v-for="item in todoList" :key="item.id" @dblclick="openEdit(item)">
            <div class="checkbox-wrapper">
              <div @click.stop="changeStatus(item)" class="circle"></div>
            </div>
            <div>
              <div class="content">{{ item.content }}</div>
              <div class="time" :class="{ overdue: isOverdue(item) }">
                {{ formatTime(item.endTime) }}
              </div>
            </div>
            <button class="menu-btn" @click.stop="toggleMenu(item.id, $event)" title="更多操作">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="5" cy="12" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="19" cy="12" r="2"></circle>
              </svg>
            </button>
            <!-- 下拉菜单 -->
            <Teleport to="body">
              <div 
                v-if="menuVisible && menuVisible[item.id] && menuPosition && menuPosition[item.id]" 
                class="menu-dropdown"
                :style="{
                  top: (menuPosition[item.id]?.top ?? 0) + 'px',
                  right: (menuPosition[item.id]?.right ?? 0) + 'px'
                }"
              >
                <div class="menu-item" @click="onMenuAction(item, 'edit')">修改</div>
                <div class="menu-item danger" @click="onMenuAction(item, 'delete')">删除</div>
              </div>
            </Teleport>
          </div>
        </div>
        
        <!-- 已完成列表 -->
        <div class="todo-list">
          <div class="list-title">已完成</div>
          
          <!-- 空状态 -->
          <div v-if="finishList.length === 0" class="empty-container">
            <div class="empty-icon">✨</div>
            <div class="empty-text">暂无已完成事项</div>
          </div>

          <div class="todo-item finish-item" v-for="item in finishList" :key="item.id">
            <div class="checkbox-wrapper">
              <div @click="changeStatus(item)" class="circle checked">
                <img class="checked-icon" src="../assets/checked.png" alt="checked">
              </div>
            </div>
            <div class="main-content">
              <div class="content">{{ item.content }}</div>
              <div class="time">
                {{ formatTime(item.endTime) }}
              </div>
            </div>
            <button class="menu-btn" @click.stop="toggleMenu(item.id, $event)" title="更多操作">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="5" cy="12" r="2"></circle>
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="19" cy="12" r="2"></circle>
              </svg>
            </button>
            <!-- 下拉菜单 -->
            <Teleport to="body">
              <div 
                v-if="menuVisible && menuVisible[item.id] && menuPosition && menuPosition[item.id]" 
                class="menu-dropdown"
                :style="{
                  top: (menuPosition[item.id]?.top ?? 0) + 'px',
                  right: (menuPosition[item.id]?.right ?? 0) + 'px'
                }"
              >
                <div class="menu-item danger" @click="onMenuAction(item, 'delete')">删除</div>
              </div>
            </Teleport>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 添加表单 -->
    <div v-if="formVisible" class="form-wrap" @click.self="showForm(false)" @keydown.ctrl.enter="submitTodo">
      <div class="todo-form">
        <div class="line-bottom">
          <div class="date-picker-label">
            <div class="opacity-20">🕒</div>
            <DatePicker v-model="formEndTime" />
          </div>
        </div>
        <div class="content-item">
          <textarea
            v-model="formContent"
            placeholder="待办事项"
            maxlength="128"
            autofocus
          ></textarea>
        </div>
        <div class="form-actions">
          <div class="form-btn confirm-btn" @click="submitTodo">{{ editingId ? '保存' : '确认' }}</div>
          <div class="form-btn close-btn" @click="showForm(false)">关闭</div>
        </div>
      </div>
    </div>
    
    <!-- 添加按钮 -->
    <div class="add-btn" @click="showForm(true)">
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { getMainColor, buildCssVars } from '../utils/theme'
import { getCache, setCache, clearCache } from '../utils/apiCache'
import { formatTime, getNextHourTimestamp } from '../utils/format'
import { showSuccess, showError } from '../utils/toast'
import { useContextMenu } from '../composables/useContextMenu'
import { useApi } from '../composables/useApi'
import { sendIpc, onIpc } from '../utils/electron'
import DatePicker from '../components/DatePicker/index.vue'
import type { Todo, TodoStats } from '../types/api'

export default {
  name: 'Todo',
  components: {
    DatePicker
  },
  setup() {
    const { get, post, patch, del, loading } = useApi()
    const { 
      menuVisible, 
      menuPosition, 
      toggleMenu, 
      handleMenuAction,
      setupClickOutsideListener 
    } = useContextMenu()

    const mainColor = ref(getMainColor())

    // 所有待办事项
    const allTodos = ref<Todo[]>([])
    // 待办和已完成列表
    const todoList = computed(() => allTodos.value.filter(item => item.status === 0))
    const finishList = computed(() => allTodos.value.filter(item => item.status === 1))
    
    const formVisible = ref(false)
    const formContent = ref('')
    const formEndTime = ref(getNextHourTimestamp())
    const editingId = ref<number | null>(null)

    // 初始化表单
    const resetForm = () => {
      formContent.value = ''
      formEndTime.value = getNextHourTimestamp()
      editingId.value = null
    }

    // 显示/隐藏表单
    const showForm = (flag: boolean, options: { isEdit?: boolean } = { isEdit: false }) => {
      formVisible.value = flag
      if (flag && !options.isEdit) resetForm()
      if (!flag) resetForm()
    }

    // 重新拉取统计并通知悬浮球
    const refreshStatsAndNotify = async () => {
      try {
        const response = await get<TodoStats>('/todo/stats')
        const stats = {
          overdue: response.data?.overdue || 0,
          pending: response.data?.pending || 0
        }
        setCache('/todo/stats', {}, stats, Number.MAX_SAFE_INTEGER)
        // 发送统计更新事件
        sendIpc('stats-updated')
      } catch (error) {
        console.error('刷新统计失败:', error)
      }
    }

    // 提交待办
    const submitTodo = async () => {
      if (!formContent.value.trim()) {
        showError('请输入待办内容')
        return
      }

      const endTime = formEndTime.value || Date.now()
      const isEdit = !!editingId.value

      try {
        if (isEdit) {
          const updateData = {
            content: formContent.value,
            endTime
          }
          await patch(`/todo/${editingId.value}`, updateData)
          
          const idx = allTodos.value.findIndex(t => t.id === editingId.value)
          if (idx !== -1) {
            allTodos.value[idx] = {
              ...allTodos.value[idx],
              content: formContent.value,
              endTime,
              noticeTime: endTime
            }
          }
          showSuccess('修改成功')
        } else {
          const createData = {
            content: formContent.value,
            endTime,
            noticeTime: endTime,
            remark: '',
            tag: 0
          }
          
          const response = await post<Todo>('/todo', createData)
          
          allTodos.value.unshift({
            ...response.data,
            endTime,
            noticeTime: endTime,
            status: 0
          })
          showSuccess('添加成功')
        }

        resetForm()
        formVisible.value = false
        
        // 清除待办列表缓存
        clearCache('/todo/all', {})
        await refreshStatsAndNotify()
        // 通知提醒数据已更新
        sendIpc('todo-updated')
        // 重新获取列表
        await getTodoList()
      } catch (error) {
        const err = error as { response?: { data?: unknown } }
        console.error('提交待办失败:', err?.response?.data || err)
        showError(isEdit ? '修改失败，请检查后端服务' : '添加失败，请检查后端服务')
      }
    }

    // 获取待办列表
    // silent 为 true 时，静默刷新
    const getTodoList = async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options
      try {
        if (!silent) {
          loading.value = true
        }
        const todoCacheKey = '/todo/all'
        
        // 检查缓存，如果有缓存立即显示
        const cachedAll = getCache<Todo[]>(todoCacheKey, {}, 2 * 60 * 1000)
        if (cachedAll) {
          allTodos.value = cachedAll
        }
        
        const response = await get<Todo[]>('/todo')
        
        allTodos.value = response.data.filter(item => item.status === 0 || item.status === 1)
        
        // 更新缓存
        setCache(todoCacheKey, {}, allTodos.value, 2 * 60 * 1000)
      } catch (error) {
        console.error('获取待办列表失败:', error)
        // 如果请求失败，尝试使用过期缓存
        const cachedAll = getCache<Todo[]>('/todo/all', {}, 10 * 60 * 1000)
        if (cachedAll) {
          allTodos.value = cachedAll
        }
      } finally {
        if (!silent) {
          loading.value = false
        }
      }
    }

    // 切换状态
    const changeStatus = async (item: Todo) => {
      try {
        const newStatus = item.status === 0 ? 1 : 0
        // 如果恢复为待完成状态，重置提醒标记，以便再次过期时可以提醒
        const updateData: { status: number; isReminded?: boolean } = { status: newStatus }
        if (newStatus === 0) {
          updateData.isReminded = false
        }
        await patch(`/todo/${item.id}`, updateData)

        item.status = newStatus
        if (newStatus === 0 && item.isReminded !== undefined) {
          item.isReminded = false
        }
        showSuccess(newStatus === 1 ? '已完成' : '已恢复')
        
        // 清除相关缓存
        clearCache('/todo/all', {})
        await refreshStatsAndNotify()
        // 通知提醒数据已更新
        sendIpc('todo-updated')
        // 重新获取列表
        await getTodoList()
      } catch (error) {
        console.error('更新状态失败:', error)
        showError('操作失败')
      }
    }

    // 删除待办
    const deleteTodo = async (item: Todo) => {
      if (!confirm('确定要删除这条待办吗？')) return

      try {
        await del(`/todo/${item.id}`)

        const idx = allTodos.value.findIndex(t => t.id === item.id)
        if (idx !== -1) {
          allTodos.value.splice(idx, 1)
        }
        
        showSuccess('删除成功')
        
        // 清除相关缓存
        clearCache('/todo/all', {})
        await refreshStatsAndNotify()
        // 通知提醒数据已更新
        sendIpc('todo-updated')
        // 重新获取列表
        await getTodoList()
      } catch (error) {
        console.error('删除待办失败:', error)
        showError('删除失败')
      }
    }

    // 打开编辑表单
    const openEdit = (item: Todo) => {
      editingId.value = item.id
      formContent.value = item.content || ''
      formEndTime.value = item.endTime || getNextHourTimestamp()
      showForm(true, { isEdit: true })
    }

    // 菜单操处理
    const onMenuAction = (item: Todo, action: string) => {
      handleMenuAction(item, action, {
        edit: openEdit,
        delete: deleteTodo
      })
    }

    // 设置点击外部关闭菜单
    setupClickOutsideListener()

    // 监听统计更新事件（包括自动过期检测），重新获取列表
    let removeStatsUpdateListener: (() => void) | null = null

    onMounted(() => {
      // 首次进入页面正常展示 loading
      getTodoList()
      resetForm()
      
      // 监听统计更新事件，当检测到过期任务时重新获取列表（静默刷新，避免闪屏）
      removeStatsUpdateListener = onIpc('stats-updated', () => {
        getTodoList({ silent: true })
      })
    })

    onUnmounted(() => {
      // 清除事件监听器
      if (removeStatsUpdateListener) {
        removeStatsUpdateListener()
        removeStatsUpdateListener = null
      }
    })

    const cssVars = computed(() => buildCssVars(mainColor.value))

    // 是否超时
    const isOverdue = (item: Todo) => item.status === 0 && item.endTime < Date.now()

    return {
      loading,
      todoList,
      finishList,
      formVisible,
      formContent,
      formEndTime,
      editingId,
      formatTime,
      showForm,
      submitTodo,
      changeStatus,
      openEdit,
      cssVars,
      isOverdue,
      menuVisible,
      menuPosition,
      toggleMenu,
      onMenuAction
    }
  }
}
</script>

<style lang="scss" scoped>
@use '../css/components.scss' as *;

.container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-item {
  position: relative;
  padding: 10px 12px;
  display: flex;
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  min-height: 44px;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

.circle {
  width: 15px;
  height: 15px;
  border: 1px solid var(--mainColor);
  border-radius: 50%;
  margin-right: 9px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
    border-color: var(--mainColorHover);
  }

  &.checked {
    background-color: var(--mainColor);
    border-color: var(--mainColor);

    span {
      color: white;
      font-size: 12px;
      font-weight: bold;
      line-height: 1;
    }
  }
}

.content {
  font-size: 13px;
  color: #333;
  font-weight: 500;
  margin-bottom: 3px;
  word-break: break-all;
  line-height: 1.4;
}

.time {
  font-size: 11px;
  color: #666;
  user-select: none;

  &.overdue {
    color: #f56c6c;
  }
}

.finish-item {
  .content {
    text-decoration: line-through;
    color: #909399;
    font-weight: normal;
  }

  .time {
    color: #bfbfbf;
  }
}

.todo-form {
  background: white;
  border-radius: 8px;
  padding: 10px;
  width: 75%;
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease-out;
}

.content-item {
  margin-bottom: 8px;
  padding: 0 5px;

  textarea {
    width: 100%;
    padding: 8px 7px;
    min-height: 64px;
    border: none;
    border-radius: 5px;
    font-size: 12px;
    line-height: 1.4;
    outline: none;
    transition: all 0.3s;
    box-sizing: border-box;
    background: #F2F3F5;
    resize: vertical;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;

    &:focus {
      background: white;
      box-shadow: 0 0 0 2px var(--mainColorFocus);
    }

    &::placeholder {
      color: #999;
    }

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.25);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  }
}

.form-btn {
  width: 75px;
  padding: 0;
  height: 25px;
  background: var(--mainColor);
  color: white;
  text-align: center;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--mainColorHover);
    box-shadow: 0 0 6px var(--mainColorShadow);
  }

  &:active {
    transform: scale(0.96);
  }
}

.close-btn {
  background: white;
  color: var(--mainColor);
  border: 1px solid var(--mainColor);

  &:hover {
    background: transparent;
    box-shadow: 0 0 6px var(--mainColorShadow);
  }
}

.line-bottom {
  &::after {
    content: '';
    display: block;
    height: 1px;
    background: #eee;
    margin: 8px 0;
  }
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
}

.checked-icon {
  width: 10px;
  height: 10px;
}

.date-picker-label {
  display: flex;
  align-items: center;
  font-weight: bold;
  color: #409EFF;
  gap: 3px;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 10px;
}
</style>
