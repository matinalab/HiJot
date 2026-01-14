/**
 * 右键菜单组合式函数
 * 统一管理菜单的显示/隐藏、位置计算、点击外部关闭等逻辑
 */

import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/** 右键菜单位置 */
interface MenuPosition {
  top: number
  right: number
}

/** 右键菜单操作处理器 */
interface MenuActionHandlers<T = unknown> {
  edit?: (item: T) => void
  delete?: (item: T) => void
  [key: string]: ((item: T) => void) | undefined
}

/** 菜单切换配置 */
interface ToggleMenuOptions {
  /** 菜单高度，默认70 */
  menuHeight?: number
}

/** useContextMenu 返回类型 */
interface UseContextMenuReturn {
  menuVisible: Ref<Record<string | number, boolean>>
  menuPosition: Ref<Record<string | number, MenuPosition>>
  toggleMenu: (itemId: string | number, event: MouseEvent, options?: ToggleMenuOptions) => void
  closeMenu: (itemId: string | number) => void
  closeAllMenus: () => void
  handleMenuAction: <T extends { id: string | number }>(
    item: T,
    action: string,
    handlers: MenuActionHandlers<T>
  ) => void
  handleClickOutside: (event: MouseEvent) => void
  setupClickOutsideListener: () => void
}

/**
 * 创建右键菜单管理器
 * @returns 菜单管理方法和状态
 */
export function useContextMenu(): UseContextMenuReturn {
  // 菜单显示状态 { [itemId]: boolean }
  const menuVisible = ref<Record<string | number, boolean>>({})
  // 菜单位置 { [itemId]: { top: number, right: number } }
  const menuPosition = ref<Record<string | number, MenuPosition>>({})

  /**
   * 切换菜单显示状态
   * @param itemId - 项目ID
   * @param event - 鼠标事件
   * @param options - 配置选项
   */
  const toggleMenu = (
    itemId: string | number,
    event: MouseEvent,
    options: ToggleMenuOptions = {}
  ): void => {
    if (itemId === undefined || itemId === null) return

    const { menuHeight = 70 } = options
    const menuKey = itemId

    // 确保已初始化
    if (!menuVisible.value) menuVisible.value = {}
    if (!menuPosition.value) menuPosition.value = {}

    // 关闭其他菜单
    Object.keys(menuVisible.value).forEach(key => {
      if (key !== String(menuKey)) {
        menuVisible.value[key] = false
        delete menuPosition.value[key]
      }
    })

    const isOpen = menuVisible.value[menuKey] || false

    // 如果打开菜单，先计算位置
    if (!isOpen && event && event.currentTarget) {
      const button = event.currentTarget as HTMLElement
      const rect = button.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // 如果下方空间不足，向上弹出
      let top: number
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        top = rect.top - menuHeight - 4
      } else {
        top = rect.bottom + 4
      }

      menuPosition.value[menuKey] = {
        top: top,
        right: window.innerWidth - rect.right
      }
      menuVisible.value[menuKey] = true
    } else {
      // 关闭时清除位置和显示状态
      menuVisible.value[menuKey] = false
      delete menuPosition.value[menuKey]
    }
  }

  /**
   * 关闭指定菜单
   * @param itemId - 项目ID
   */
  const closeMenu = (itemId: string | number): void => {
    const menuKey = itemId
    menuVisible.value[menuKey] = false
    delete menuPosition.value[menuKey]
  }

  /**
   * 关闭所有菜单
   */
  const closeAllMenus = (): void => {
    menuVisible.value = {}
    menuPosition.value = {}
  }

  /**
   * 处理菜单操作
   * @param item - 数据项
   * @param action - 操作类型
   * @param handlers - 操作处理函数 { edit: fn, delete: fn, ... }
   */
  const handleMenuAction = <T extends { id: string | number }>(
    item: T,
    action: string,
    handlers: MenuActionHandlers<T> = {}
  ): void => {
    closeMenu(item.id)
    const handler = handlers[action]
    if (typeof handler === 'function') {
      handler(item)
    }
  }

  /**
   * 点击外部关闭菜单的处理函数
   * @param event - 鼠标事件
   */
  const handleClickOutside = (event: MouseEvent): void => {
    const target = event.target as HTMLElement
    if (!target.closest('.menu-btn') && !target.closest('.menu-dropdown')) {
      closeAllMenus()
    }
  }

  /**
   * 自动注册/注销点击外部关闭事件
   */
  const setupClickOutsideListener = (): void => {
    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })
  }

  return {
    menuVisible,
    menuPosition,
    toggleMenu,
    closeMenu,
    closeAllMenus,
    handleMenuAction,
    handleClickOutside,
    setupClickOutsideListener
  }
}

