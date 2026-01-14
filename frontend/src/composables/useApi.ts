/**
 * API 调用组合式函数
 * 封装 API 调用，支持 loading 状态和统一错误处理
 */

import { ref, getCurrentInstance } from 'vue'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type { Ref } from 'vue'
import { showToast } from '../utils/toast'

/** 后端统一响应格式 */
interface BackendResponse<T> {
  code: number
  message: string
  data: T
  attribute?: PaginationAttribute
}

/** 分页属性 */
interface PaginationAttribute {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 解包后的响应结果 */
interface UnwrappedResponse<T> {
  data: T
  attribute?: PaginationAttribute
}

/** API 请求配置选项 */
interface RequestOptions {
  /** 是否显示 loading，默认 true */
  showLoading?: boolean
  /** 是否显示错误提示，默认 true */
  showError?: boolean
  /** 自定义错误消息 */
  errorMessage?: string
}

/** useApi 返回类型 */
interface UseApiReturn {
  api: AxiosInstance | undefined
  loading: Ref<boolean>
  error: Ref<Error | null>
  request: <T>(apiCall: () => Promise<T>, options?: RequestOptions) => Promise<T>
  get: <T = unknown>(url: string, options?: RequestOptions) => Promise<UnwrappedResponse<T>>
  post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<UnwrappedResponse<T>>
  patch: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<UnwrappedResponse<T>>
  del: <T = unknown>(url: string, options?: RequestOptions) => Promise<UnwrappedResponse<T>>
}

/**
 * 解包后端响应，提取业务数据
 * @param response - Axios 响应对象
 * @returns 解包后的响应结果
 */
function unwrapResponse<T>(response: AxiosResponse<BackendResponse<T>>): UnwrappedResponse<T> {
  const backendData = response.data
  return {
    data: backendData.data,
    attribute: backendData.attribute
  }
}

/**
 * 创建 API 调用管理器
 * @returns API 调用方法和状态
 */
export function useApi(): UseApiReturn {
  const instance = getCurrentInstance()
  const proxy = instance?.proxy
  const api = proxy?.$api as AxiosInstance | undefined

  // 加载状态
  const loading = ref(false)
  // 错误信息
  const error = ref<Error | null>(null)

  /**
   * 执行 API 请求
   * @param apiCall - API 调用函数
   * @param options - 配置选项
   * @returns 请求结果
   */
  const request = async <T>(
    apiCall: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> => {
    const {
      showLoading = true,
      showError = true,
      errorMessage = '操作失败，请检查网络连接'
    } = options

    if (showLoading) {
      loading.value = true
    }
    error.value = null

    try {
      const result = await apiCall()
      return result
    } catch (err) {
      const e = err as Error & { response?: { data?: { message?: string } } }
      error.value = e
      console.error('API 请求失败:', e)

      if (showError) {
        const message = e?.response?.data?.message || errorMessage
        showToast(message, 'error')
      }

      throw e
    } finally {
      if (showLoading) {
        loading.value = false
      }
    }
  }

  /**
   * GET 请求（自动解包后端响应）
   * @param url - 请求地址
   * @param options - 配置选项
   * @returns 解包后的业务数据
   */
  const get = async <T = unknown>(url: string, options: RequestOptions = {}): Promise<UnwrappedResponse<T>> => {
    const response = await request(() => api!.get<BackendResponse<T>>(url), options)
    return unwrapResponse(response)
  }

  /**
   * POST 请求（自动解包后端响应）
   * @param url - 请求地址
   * @param data - 请求数据
   * @param options - 配置选项
   * @returns 解包后的业务数据
   */
  const post = async <T = unknown>(url: string, data?: unknown, options: RequestOptions = {}): Promise<UnwrappedResponse<T>> => {
    const response = await request(() => api!.post<BackendResponse<T>>(url, data), options)
    return unwrapResponse(response)
  }

  /**
   * PATCH 请求（自动解包后端响应）
   * @param url - 请求地址
   * @param data - 请求数据
   * @param options - 配置选项
   * @returns 解包后的业务数据
   */
  const patch = async <T = unknown>(url: string, data?: unknown, options: RequestOptions = {}): Promise<UnwrappedResponse<T>> => {
    const response = await request(() => api!.patch<BackendResponse<T>>(url, data), options)
    return unwrapResponse(response)
  }

  /**
   * DELETE 请求（自动解包后端响应）
   * @param url - 请求地址
   * @param options - 配置选项
   * @returns 解包后的业务数据
   */
  const del = async <T = unknown>(url: string, options: RequestOptions = {}): Promise<UnwrappedResponse<T>> => {
    const response = await request(() => api!.delete<BackendResponse<T>>(url), options)
    return unwrapResponse(response)
  }

  return {
    api,
    loading,
    error,
    request,
    get,
    post,
    patch,
    del
  }
}
