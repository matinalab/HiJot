<template>
  <div class="container" :style="cssVars">
    <div class="list-container">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <template v-else>
        <!-- 随心记列表 -->
        <div class="essay-list">
          <div class="list-title">随心记</div>
          
          <!-- 空状态 -->
          <div v-if="essayList.length === 0" class="empty-container">
            <div class="empty-icon">✍️</div>
            <div class="empty-text">暂无随心记</div>
          </div>

          <div
            class="essay-item"
            v-for="item in essayList"
            :key="item.id"
            @dblclick="openEdit(item)"
          >
            <div class="essay-header" :class="{ 'time-container': item.status !== 0 }">
              <div class="header-left">
                <div class="title-wrap">
                  <div class="title-dot">丨</div>
                  <div class="essay-title">
                    {{ displayTitle(item) }}
                  </div>
                </div>
              </div>
              <button class="toggle-btn" @click.stop="changeStatus(item)" @dblclick.stop title="展开/收起">
                <svg
                  class="toggle-icon"
                  :class="{ rotated: item.status === 0 }"
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  stroke="currentColor"
                  stroke-width="2.5"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
            <div v-if="item.status === 0" class="essay-content" :class="{ 'time-container': item.status === 0 }" v-html="item.content"></div>

            <div class="essay-time">{{ item.time }}</div>
            
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
      </template>
    </div>

    <!-- 添加按钮 -->
    <div class="add-btn text-fff" @click="showForm(true)">
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>

    <!-- 弹窗表单 -->
    <div v-if="formVisible" class="form-wrap" @click.self="showForm(false)">
      <div class="form-card">
        <div class="form-header">
          <div class="form-title">{{ editingId ? '编辑随心记' : '新建随心记' }}</div>
          <div class="form-tip">Ctrl + Enter 保存</div>
        </div>
        <input v-model.trim="title" class="title-input" type="text" placeholder="标题" maxlength="64" />
        <div
          ref="editingEssay"
          class="content-editor"
          contenteditable="true"
          placeholder="记录内容"
          @keydown.ctrl.enter="submitEssay"
        ></div>
        <div class="form-actions">
          <button class="btn primary" @click="submitEssay">保存</button>
          <button class="btn ghost" @click="resetForm">清空</button>
          <button class="btn gray" @click="showForm(false)">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { getMainColor, buildCssVars } from '../utils/theme'
import { getCache, setCache, clearCache } from '../utils/apiCache'
import { formatTime, extractTitleFromHtml } from '../utils/format'
import { showSuccess, showError } from '../utils/toast'
import { useContextMenu } from '../composables/useContextMenu'
import { useApi } from '../composables/useApi'
import type { Essay } from '../types/api'

/**  Essay 类型 */
interface EssayDisplay {
  id: number
  title: string
  content: string
  time: string
  status: 0 | 1
}

export default {
  name: 'Essay',
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

    const editingEssay = ref<HTMLDivElement | null>(null)
    const title = ref('')
    const essayList = ref<EssayDisplay[]>([])
    const formVisible = ref(false)
    const editingId = ref<number | null>(null)

    // 清空表单
    const resetForm = () => {
      title.value = ''
      if (editingEssay.value) {
        editingEssay.value.innerHTML = ''
      }
      editingId.value = null
    }

    // 打开/关闭表单
    const showForm = (flag: boolean, options: { isEdit?: boolean } = { isEdit: false }) => {
      formVisible.value = flag
      if (flag && !options.isEdit) resetForm()
      if (!flag) resetForm()
    }

    // 提交随心记
    const submitEssay = async () => {
      const content = editingEssay.value?.innerHTML?.trim()
      const pureContent = content?.replace(/<[^>]+>/g, '').trim()
      
      if ((!title.value || !title.value.trim()) && !pureContent) {
        showError('请输入标题或内容')
        return
      }
      if (!content || content === '<div><br></div>' || content === '<br>') {
        showError('请输入内容')
        return
      }

      try {
        if (editingId.value) {
          await patch(`/essay/${editingId.value}`, {
            title: title.value,
            content
          })

          const idx = essayList.value.findIndex(t => t.id === editingId.value)
          if (idx !== -1) {
            essayList.value[idx] = {
              ...essayList.value[idx],
              title: title.value || extractTitleFromHtml(content),
              content
            }
          }
          showSuccess('修改成功')
        } else {
          const timeStamp = Date.now()
          const response = await post<Essay>('/essay', {
            title: title.value,
            content,
            time: timeStamp
          })

          const item: EssayDisplay = {
            id: response.data.id,
            time: formatTime(timeStamp),
            title: title.value || extractTitleFromHtml(content),
            content,
            status: 0 as 0 | 1
          }
          essayList.value.unshift(item)
          showSuccess('添加成功')
        }

        // 清除缓存
        clearCache('/essay', {})
        
        resetForm()
        formVisible.value = false
      } catch (error) {
        console.error('提交失败:', error)
        showError('提交失败，请检查后端服务')
      }
    }

    // 获取随心记列表
    const getEssayList = async () => {
      try {
        loading.value = true
        
        // 先检查缓存
        const cached = getCache<Essay[]>('/essay', {}, 2 * 60 * 1000)
        if (cached) {
          essayList.value = cached.map(item => ({
            ...item,
            title: item.title || extractTitleFromHtml(item.content),
            time: formatTime(item.time)
          }))
        }
        
        // 请求最新数据
        const response = await get<Essay[]>('/essay')
        const formattedData = response.data.map(item => ({
          ...item,
          title: item.title || extractTitleFromHtml(item.content),
          time: formatTime(item.time)
        }))
        
        essayList.value = formattedData
        
        // 更新缓存
        setCache('/essay', {}, response.data, 2 * 60 * 1000)
      } catch (error) {
        console.error('获取列表失败:', error)
        // 如果请求失败，尝试使用过期缓存
        const expiredCache = getCache<Essay[]>('/essay', {}, 10 * 60 * 1000)
        if (expiredCache) {
          essayList.value = expiredCache.map(item => ({
            ...item,
            title: item.title || extractTitleFromHtml(item.content),
            time: formatTime(item.time)
          }))
        }
      } finally {
        loading.value = false
      }
    }

    // 切换展开/关闭
    const changeStatus = async (item: EssayDisplay) => {
      try {
        const newStatus = item.status === 0 ? 1 : 0
        await patch(`/essay/${item.id}`, { status: newStatus })
        item.status = newStatus as 0 | 1
        // 清除缓存
        clearCache('/essay', {})
      } catch (error) {
        console.error('更新状态失败:', error)
        showError('操作失败')
      }
    }

    const cssVars = computed(() => buildCssVars(mainColor.value))

    const openEdit = async (item: EssayDisplay) => {
      editingId.value = item.id
      title.value = item.title || ''
      showForm(true, { isEdit: true })

      await nextTick()
      if (editingEssay.value) {
        editingEssay.value.innerHTML = item.content || ''
      }
    }

    const displayTitle = (item: EssayDisplay) => item.title || extractTitleFromHtml(item.content)

    // 删除随心记
    const deleteEssay = async (item: EssayDisplay) => {
      if (!confirm('确定要删除这条随心记吗？')) {
        return
      }
      
      try {
        await del(`/essay/${item.id}`)
        
        const idx = essayList.value.findIndex(t => t.id === item.id)
        if (idx !== -1) {
          essayList.value.splice(idx, 1)
        }
        
        showSuccess('删除成功')
        
        // 清除缓存
        clearCache('/essay', {})
      } catch (error) {
        console.error('删除失败:', error)
        showError('删除失败，请检查后端服务')
      }
    }

    // 菜单操作处理
    const onMenuAction = (item: EssayDisplay, action: string) => {
      handleMenuAction(item, action, {
        edit: openEdit,
        delete: deleteEssay
      })
    }

    // 设置点击外部关闭菜单
    setupClickOutsideListener()

    onMounted(() => {
      getEssayList()
    })

    return {
      loading,
      editingEssay,
      title,
      essayList,
      formVisible,
      editingId,
      submitEssay,
      resetForm,
      showForm,
      displayTitle,
      changeStatus,
      openEdit,
      cssVars,
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
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #f0f0f0;
  width: 90%;
  max-width: 380px;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 5px;
}

.form-title {
  font-size: 14px;
  font-weight: 700;
  color: #333;
}

.form-tip {
  font-size: 11px;
  color: #999;
}

.title-input {
  width: 100%;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
  transition: all 0.3s;

  &:focus {
    background: #fff;
    box-shadow: 0 0 0 2px var(--mainColorFocus);
    border-color: transparent;
  }
}

.content-editor {
  min-height: 120px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  padding: 10px;
  background: #f7f8fa;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  transition: all 0.3s;

  &:focus {
    background: #fff;
    box-shadow: 0 0 0 2px var(--mainColorFocus);
    border-color: transparent;
  }

  &:empty:before {
    content: attr(placeholder);
    color: #999;
    pointer-events: none;
  }

  img {
    max-width: 100%;
    border-radius: 6px;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.essay-list {
  display: flex;
  flex-direction: column;
}

.essay-item {
  position: relative;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s;
  margin-bottom: 8px;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

.essay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 4px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.time-container {
  padding-bottom: 25px !important;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.title-wrap {
  display: flex;
}

.essay-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  color: #333;
  align-self: center;
}

.title-dot {
  color: var(--mainColor);
  margin-right: 2px;
}

.essay-time {
  position: absolute;
  bottom: 4px;
  left: 6px;
  color: #e0e0e0;
  font-weight: normal;
  font-size: 11px;
}

.toggle-btn {
  border: none;
  color: #999;
  background: transparent;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
  opacity: 0.6;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--mainColor);
    opacity: 1;
  }

  &:active {
    transform: scale(0.95);
  }
}

.toggle-icon {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &.rotated {
    transform: rotate(90deg);
  }
}

.essay-content {
  padding: 5px 12px;
  font-size: 12px;
  line-height: 1.2;
  color: #333;
  word-break: break-word;
  background: #fff;

  div,
  img {
    margin-bottom: 5px;
  }

  img {
    max-width: 100%;
    border-radius: 4px;
  }
}
</style>
