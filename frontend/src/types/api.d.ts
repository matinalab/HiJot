/**
 * API 相关类型定义
 */

/** API 响应基础结构 */
export interface ApiResponse<T = unknown> {
  data: T
  fromCache?: boolean
  expired?: boolean
}

/** 待办事项 */
export interface Todo {
  id: number
  content: string
  endTime: number
  noticeTime: number
  remark: string
  tag: number
  status: 0 | 1 // 0: 待完成, 1: 已完成
  isReminded?: boolean // 是否已提醒过
}

/** 待办统计 */
export interface TodoStats {
  overdue: number
  pending: number
}

/** 随心记 */
export interface Essay {
  id: number
  title: string
  content: string
  time: number
  status: 0 | 1 // 0: 展开, 1: 收起
}

/** 应用配置 */
export interface AppConfig {
  opacity: number
  mainColor: string
  subColor: string
  hoverFeatures: ('todo' | 'essay')[]
  systemNotification?: boolean
}

