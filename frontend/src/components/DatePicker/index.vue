<template>
  <div class="date-picker" :style="cssVars">
    <!-- 显示在输入框左下角的小时间文本 -->
    <div class="time-text" @click="openPicker">
      {{ displayText }}
    </div>

    <!-- 弹出层：滚轮式选择 -->
    <div v-if="visible" class="picker" @click.self="closePicker">
      <div class="picker-panel">
        <div class="picker-panel-title">{{ currentSelectedText }}</div>

        <div class="picker-wheel-wrapper" ref="pickerWheelWrapperRef">
          <div class="picker-center-line"></div>
          <div class="picker-wheel-row">
            <!-- 年 -->
            <div class="wheel-list" ref="yearListRef" 
                 @scroll="handleScroll('year', $event)"
                 @mousedown="handleListMouseDown('year', $event)"
                 @mousemove="handleListMouseMove('year', $event)"
                 @mouseup="handleListMouseUp('year', $event)"
                 @mouseleave="handleListMouseLeave('year')">
              <div v-for="y in yearOptions" :key="y" class="wheel-item" :class="{ active: y === year }"
                @click="handleItemClick('year', y)">
                {{ y }}
              </div>
            </div>

            <!-- 月 -->
            <div class="wheel-list" ref="monthListRef" 
                 @scroll="handleScroll('month', $event)"
                 @mousedown="handleListMouseDown('month', $event)"
                 @mousemove="handleListMouseMove('month', $event)"
                 @mouseup="handleListMouseUp('month', $event)"
                 @mouseleave="handleListMouseLeave('month')">
              <div v-for="m in monthOptions" :key="m" class="wheel-item" :class="{ active: m === month }"
                @click="handleItemClick('month', m)">
                {{ m }}
              </div>
            </div>

            <!-- 日 -->
            <div class="wheel-list" ref="dateListRef" 
                 @scroll="handleScroll('date', $event)"
                 @mousedown="handleListMouseDown('date', $event)"
                 @mousemove="handleListMouseMove('date', $event)"
                 @mouseup="handleListMouseUp('date', $event)"
                 @mouseleave="handleListMouseLeave('date')">
              <div v-for="d in dateOptions" :key="d" class="wheel-item" :class="{ active: d === date }"
                @click="handleItemClick('date', d)">
                {{ d }}
              </div>
            </div>

            <!-- 时 -->
            <div class="wheel-list" ref="hourListRef" 
                 @scroll="handleScroll('hour', $event)"
                 @mousedown="handleListMouseDown('hour', $event)"
                 @mousemove="handleListMouseMove('hour', $event)"
                 @mouseup="handleListMouseUp('hour', $event)"
                 @mouseleave="handleListMouseLeave('hour')">
              <div v-for="h in hourOptions" :key="h" class="wheel-item" :class="{ active: h === hour }"
                @click="handleItemClick('hour', h)">
                {{ format2(h) }}
              </div>
            </div>

            <!-- 分 -->
            <div class="wheel-list" ref="minuteListRef" 
                 @scroll="handleScroll('minute', $event)"
                 @mousedown="handleListMouseDown('minute', $event)"
                 @mousemove="handleListMouseMove('minute', $event)"
                 @mouseup="handleListMouseUp('minute', $event)"
                 @mouseleave="handleListMouseLeave('minute')">
              <div v-for="m in minuteOptions" :key="m" class="wheel-item" :class="{ active: m === minute }"
                @click="handleItemClick('minute', m)">
                {{ format2(m) }}
              </div>
            </div>
          </div>
        </div>
        <div class="picker-wheel-wrapper-footer">
          <span class="text">年</span>
          <span class="text">月</span>
          <span class="text">日</span>
          <span class="text">时</span>
          <span class="text">分</span>
        </div>

        <div class="picker-panel-footer">
          <button class="btn" @click="closePicker">取消</button>
          <button class="btn-confirm" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, type Ref } from 'vue'
import { createWheelDragHandler } from '../../utils/wheelDrag'
import { getMainColor, buildCssVars } from '../../utils/theme'

export default {
  name: 'DatePicker',
  props: {
    modelValue: {
      type: Number,
      default: () => Date.now()
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    type ColumnKey = 'year' | 'month' | 'date' | 'hour' | 'minute'

    const visible = ref(false)
    
    // 主题色支持
    const mainColor = ref(getMainColor())
    const cssVars = computed(() => buildCssVars(mainColor.value))

    const year = ref(0)
    const month = ref(0)
    const date = ref(0)
    const hour = ref(0)
    const minute = ref(0)

    // 列表 refs
    const yearListRef: Ref<HTMLDivElement | null> = ref(null)
    const monthListRef: Ref<HTMLDivElement | null> = ref(null)
    const dateListRef: Ref<HTMLDivElement | null> = ref(null)
    const hourListRef: Ref<HTMLDivElement | null> = ref(null)
    const minuteListRef: Ref<HTMLDivElement | null> = ref(null)
    const pickerWheelWrapperRef: Ref<HTMLDivElement | null> = ref(null)

    // 列 key 配置，统一映射
    const columnKeys: ColumnKey[] = ['year', 'month', 'date', 'hour', 'minute']

    const listRefMap: Record<ColumnKey, Ref<HTMLDivElement | null>> = {
      year: yearListRef,
      month: monthListRef,
      date: dateListRef,
      hour: hourListRef,
      minute: minuteListRef
    }

    // 滚动定时器，用于防抖
    const scrollTimers: Partial<Record<ColumnKey, ReturnType<typeof setTimeout> | null>> = {}

    // 获取 item 元素的实际高度
    const getItemHeight = (listEl: HTMLElement | null) => {
      if (!listEl) return 28
      const firstItem = listEl.querySelector('.wheel-item')
      if (firstItem) {
        const el = firstItem as HTMLElement
        return el.offsetHeight || el.clientHeight || 28
      }
      return 28
    }

    const getListPadding = (listEl: HTMLElement | null) => {
      if (!listEl) return 0
      const pad = parseFloat(listEl.style.paddingTop || '0')
      return Number.isNaN(pad) ? 0 : pad
    }

    // 根据外层容器高度设置上下 padding，让最上/最下选项也能滚到中线
    const setWheelPadding = () => {
      const wrapperHeight = pickerWheelWrapperRef.value?.clientHeight || 0
      if (!wrapperHeight) return
      const lists: Array<HTMLElement | null> = [
        yearListRef.value,
        monthListRef.value,
        dateListRef.value,
        hourListRef.value,
        minuteListRef.value
      ]
      lists.forEach(listEl => {
        if (!listEl) return
        const itemHeight = getItemHeight(listEl)
        const pad = Math.max(0, wrapperHeight / 2 - itemHeight / 2)
        listEl.style.paddingTop = `${pad}px`
        listEl.style.paddingBottom = `${pad}px`
      })
    }

    // 选项列表
    const yearOptions = computed(() => {
      const current = new Date().getFullYear()
      const list = []
      for (let y = current - 5; y <= current + 5; y++) {
        list.push(y)
      }
      return list
    })

    const monthOptions = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))
    const hourOptions = computed(() => Array.from({ length: 24 }, (_, i) => i))
    const minuteOptions = computed(() => Array.from({ length: 60 }, (_, i) => i))

    const dateOptions = computed(() => {
      const y = year.value || new Date().getFullYear()
      const m = month.value || 1
      const daysInMonth = new Date(y, m, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => i + 1)
    })

    const optionsMap = {
      year: yearOptions,
      month: monthOptions,
      date: dateOptions,
      hour: hourOptions,
      minute: minuteOptions
    }

    const valueSetters: Record<ColumnKey, (v: number) => void> = {
      year: (v: number) => { year.value = v },
      month: (v: number) => { month.value = v },
      date: (v: number) => { date.value = v },
      hour: (v: number) => { hour.value = v },
      minute: (v: number) => { minute.value = v }
    }

    const format2 = (val: number) => String(val).padStart(2, '0')

    // 滚动到指定 item 的中间位置（让 item 中心对齐到容器中心线）
    const scrollToItem = (listEl: HTMLElement | null, index: number) => {
      if (!listEl) return
      const itemHeight = getItemHeight(listEl)
      const paddingOffset = getListPadding(listEl)
      const containerHeight = listEl.clientHeight
      // 计算中心线的位置（容器高度的 50%）
      const centerLinePosition = containerHeight / 2
      // item 顶部位置
      const itemTop = paddingOffset + index * itemHeight
      // item 中心位置
      const itemCenter = itemTop + itemHeight / 2
      // 需要滚动的距离：让 item 中心对齐到中心线
      const targetScroll = itemCenter - centerLinePosition
      const maxScrollTop = listEl.scrollHeight - listEl.clientHeight
      const finalScroll = Math.max(0, Math.min(Math.round(targetScroll), maxScrollTop))
      listEl.scrollTop = finalScroll
    }

    const getOptionsByType = (type: ColumnKey) => optionsMap[type]?.value || []

    const updateValueByType = (type: ColumnKey, value: number) => valueSetters[type]?.(value)

    const getListElByType = (type: ColumnKey) => listRefMap[type]?.value || null

    const clearScrollTimer = (type: ColumnKey) => {
      if (scrollTimers[type]) {
        clearTimeout(scrollTimers[type])
        scrollTimers[type] = null
      }
    }

    const scheduleSnap = (type: ColumnKey, listEl: HTMLElement | null, delay = 150) => {
      if (!listEl) return
      clearScrollTimer(type)
      scrollTimers[type] = setTimeout(() => {
        snapToNearest(type, listEl)
      }, delay)
    }

    const dragHandlers: Record<ColumnKey, ReturnType<typeof createWheelDragHandler<ColumnKey>>> = columnKeys.reduce((acc, key) => {
      acc[key] = createWheelDragHandler({
        type: key,
        getListEl: () => getListElByType(key),
        onDragStart: clearScrollTimer,
        onDragEnd: (t, el) => scheduleSnap(t, el, 100)
      })
      return acc
    }, {} as Record<ColumnKey, ReturnType<typeof createWheelDragHandler<ColumnKey>>>)

    const snapToNearest = (type: ColumnKey, listEl: HTMLElement | null) => {
      if (!listEl) return
      const options = getOptionsByType(type)
      if (options.length === 0) return

      const scrollTop = listEl.scrollTop
      const itemHeight = getItemHeight(listEl)
      const paddingOffset = getListPadding(listEl)
      const containerHeight = listEl.clientHeight
      const centerLinePosition = containerHeight / 2

      const centerContentPosition = scrollTop + centerLinePosition
      let nearestIndex = Math.round(
        (centerContentPosition - paddingOffset - itemHeight / 2) / itemHeight
      )

      nearestIndex = Math.max(0, Math.min(nearestIndex, options.length - 1))

      const itemTop = paddingOffset + nearestIndex * itemHeight
      const itemCenter = itemTop + itemHeight / 2
      const targetScroll = itemCenter - centerLinePosition
      const maxScrollTop = listEl.scrollHeight - listEl.clientHeight
      listEl.scrollTop = Math.max(0, Math.min(Math.round(targetScroll), maxScrollTop))

      if (options[nearestIndex] !== undefined) {
        updateValueByType(type, options[nearestIndex])
      }
    }

    // 处理滚动事件，实现吸附效果
    const handleScroll = (type: ColumnKey, event: Event) => {
      const listEl = event.target as HTMLElement | null
      if (!listEl) return
      if (dragHandlers[type]?.state.isDragging) return
      scheduleSnap(type, listEl, 150)
    }

    // 处理点击事件，滚动到中间
    const handleItemClick = (type: ColumnKey, value: number) => {
      // 如果正在拖拽，不触发选择
      if (dragHandlers[type]?.state.isDragging) return
      
      const listEl = getListElByType(type)
      const options = getOptionsByType(type)
      const index = options.indexOf(value)
      updateValueByType(type, value)

      if (listEl && index >= 0) {
        scrollToItem(listEl, index)
      }
    }

    const syncFromValue = (value?: number) => {
      // 如果没传值，使用当前时间；有传值就使用传入的时间
      const d = value ? new Date(value) : new Date()
      year.value = d.getFullYear()
      month.value = d.getMonth() + 1
      date.value = d.getDate()
      hour.value = d.getHours()
      minute.value = d.getMinutes()

      // 同步后滚动到中间位置
      nextTick(() => {
        const yIndex = yearOptions.value.indexOf(year.value)
        if (yIndex >= 0) scrollToItem(yearListRef.value, yIndex)

        const mIndex = monthOptions.value.indexOf(month.value)
        if (mIndex >= 0) scrollToItem(monthListRef.value, mIndex)

        const dIndex = dateOptions.value.indexOf(date.value)
        if (dIndex >= 0) scrollToItem(dateListRef.value, dIndex)

        const hIndex = hourOptions.value.indexOf(hour.value)
        if (hIndex >= 0) scrollToItem(hourListRef.value, hIndex)

        const minIndex = minuteOptions.value.indexOf(minute.value)
        if (minIndex >= 0) scrollToItem(minuteListRef.value, minIndex)
      })
    }

    // 初始同步
    syncFromValue(props.modelValue)

    watch(
      () => props.modelValue,
      (val) => {
        syncFromValue(val)
      }
    )

    // 左下角显示的时间文本（基于外部传入的 modelValue）
    const displayText = computed(() => {
      if (props.modelValue) {
        const d = new Date(props.modelValue)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const da = String(d.getDate()).padStart(2, '0')
        const h = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        return `${y}-${m}-${da} ${h}:${mi}`
      }
      // 没传值时，如果值已初始化就用选中的值，否则用当前时间
      if (year.value === 0 && month.value === 0 && date.value === 0) {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const da = String(now.getDate()).padStart(2, '0')
        const h = String(now.getHours()).padStart(2, '0')
        const mi = String(now.getMinutes()).padStart(2, '0')
        return `${y}-${m}-${da} ${h}:${mi}`
      }
      const m = String(month.value).padStart(2, '0')
      const da = String(date.value).padStart(2, '0')
      const h = String(hour.value).padStart(2, '0')
      const mi = String(minute.value).padStart(2, '0')
      return `${year.value}-${m}-${da} ${h}:${mi}`
    })

    // 顶部 title 显示的时间（基于当前选中的值，实时更新）
    const currentSelectedText = computed(() => {
      // 如果值还没初始化（都是0），使用当前时间
      if (year.value === 0 && month.value === 0 && date.value === 0) {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const da = String(now.getDate()).padStart(2, '0')
        const h = String(now.getHours()).padStart(2, '0')
        const mi = String(now.getMinutes()).padStart(2, '0')
        return `${y}-${m}-${da} ${h}:${mi}`
      }
      const m = String(month.value).padStart(2, '0')
      const da = String(date.value).padStart(2, '0')
      const h = String(hour.value).padStart(2, '0')
      const mi = String(minute.value).padStart(2, '0')
      return `${year.value}-${m}-${da} ${h}:${mi}`
    })

    const openPicker = () => {
      // 如果没传值，使用当前时间；有传值就使用传入的时间
      syncFromValue(props.modelValue)
      visible.value = true
      // 等待 DOM 渲染后再滚动到中间，使用双重 nextTick 确保 DOM 完全渲染
      nextTick(() => {
        nextTick(() => {
          setWheelPadding()
          const yIndex = yearOptions.value.indexOf(year.value)
          if (yIndex >= 0 && yearListRef.value) scrollToItem(yearListRef.value, yIndex)

          const mIndex = monthOptions.value.indexOf(month.value)
          if (mIndex >= 0 && monthListRef.value) scrollToItem(monthListRef.value, mIndex)

          const dIndex = dateOptions.value.indexOf(date.value)
          if (dIndex >= 0 && dateListRef.value) scrollToItem(dateListRef.value, dIndex)

          const hIndex = hourOptions.value.indexOf(hour.value)
          if (hIndex >= 0 && hourListRef.value) scrollToItem(hourListRef.value, hIndex)

          const minIndex = minuteOptions.value.indexOf(minute.value)
          if (minIndex >= 0 && minuteListRef.value) scrollToItem(minuteListRef.value, minIndex)
        })
      })
    }

    const closePicker = () => {
      visible.value = false
    }

    const confirm = () => {
      // 简单边界处理
      if (month.value < 1) month.value = 1
      if (month.value > 12) month.value = 12
      if (date.value < 1) date.value = 1
      if (date.value > 31) date.value = 31
      if (hour.value < 0) hour.value = 0
      if (hour.value > 23) hour.value = 23
      if (minute.value < 0) minute.value = 0
      if (minute.value > 59) minute.value = 59

      const d = new Date(
        year.value,
        month.value - 1,
        date.value,
        hour.value,
        minute.value,
        0
      )
      emit('update:modelValue', d.getTime())
      visible.value = false
    }

    onMounted(() => {
      nextTick(() => {
        setWheelPadding()
      })
      window.addEventListener('resize', setWheelPadding)
    })

    // 组件卸载时清理事件监听器
    onUnmounted(() => {
      window.removeEventListener('resize', setWheelPadding)
      Object.values(dragHandlers).forEach(handler => handler?.dispose?.())
    })

    return {
      visible,
      year,
      month,
      date,
      hour,
      minute,
      yearOptions,
      monthOptions,
      dateOptions,
      hourOptions,
      minuteOptions,
      displayText,
      currentSelectedText,
      openPicker,
      closePicker,
      confirm,
      pickerWheelWrapperRef,
      yearListRef,
      monthListRef,
      dateListRef,
      hourListRef,
      minuteListRef,
      handleScroll,
      handleItemClick,
      handleListMouseDown: (type: ColumnKey, event: MouseEvent) => dragHandlers[type]?.handleMouseDown(event),
      handleListMouseMove: (type: ColumnKey, event: MouseEvent) => dragHandlers[type]?.handleMouseMove(event),
      handleListMouseUp: (type: ColumnKey, _event?: MouseEvent) => dragHandlers[type]?.handleMouseUp(),
      handleListMouseLeave: (type: ColumnKey, _event?: MouseEvent) => dragHandlers[type]?.handleMouseLeave(),
      format2,
      cssVars
    }
  }
}
</script>

<style lang="scss" scoped>
.date-picker {
  position: relative;
  font-weight: normal;

  .time-text {
    font-size: 12px;
    text-align: left;
    font-weight: bold;
    cursor: pointer;
  }

  .picker {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;

    .picker-panel {
      height: 60vh;
      display: flex;
      flex-direction: column;
      background-color: #fff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      margin: 0 16px;
      padding: 10px;

      .picker-panel-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 5px;
        text-align: center;
      }

      .picker-wheel-wrapper {
        position: relative;
        overflow: hidden;
        margin: 8px 0;

        .picker-center-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 28px;
          margin-top: -14px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          pointer-events: none;
          z-index: 1;
        }

        .picker-wheel-row {
          display: flex;
          justify-content: space-between;
          position: relative;
          z-index: 2;
          height: 100%;

          .wheel-list {
            width: 50px;
            height: 100%;
            overflow-y: auto;
            scrollbar-width: none;
            cursor: grab;
            overscroll-behavior: contain;

            &::-webkit-scrollbar {
              display: none;
            }

            .wheel-item {
              height: 28px;
              line-height: 28px;
              font-size: 13px;
              text-align: center;
              cursor: pointer;
              color: #666;
              user-select: none;
              -webkit-user-select: none;
              touch-action: pan-y;

              &.active {
                color: var(--mainColor);
                font-weight: 600;
              }
            }
          }
        }
      }

      .picker-wheel-wrapper-footer {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #999;
        text-align: center;

        .text {
          width: 50px;
          font-size: 12px;
          color: #999;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      .picker-panel-footer {
        display: flex;
        justify-content: flex-end;
        gap: 15px;
        margin-top: 20px;
        margin-bottom: 3px;

        .btn {
          border: none;
          border-radius: 15px;
          padding: 4px 16px;
          font-size: 12px;
          cursor: pointer;
          background: #f5f5f5;
        }
        .btn-confirm {
          background: var(--mainColor);
          color: #fff;
          border: none;
          border-radius: 15px;
          padding: 4px 16px;
          font-size: 12px;
          cursor: pointer;
          
          &:hover {
            background: var(--mainColorHover);
          }
        }
      }
    }
  }
}
</style>
