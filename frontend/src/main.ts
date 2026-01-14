import { createApp } from 'vue'
import type { App } from 'vue'
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig, AxiosError } from 'axios'
import App_ from './App.vue'
import axios from 'axios'

// 从环境变量获取 API 地址
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * 预连接到 API 服务器（加速首次请求）
 */
const preconnectToAPI = (): void => {
  // 预连接
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = API_BASE_URL
  document.head.appendChild(link)
  
  // DNS 预解析
  const dnsLink = document.createElement('link')
  dnsLink.rel = 'dns-prefetch'
  dnsLink.href = API_BASE_URL
  document.head.appendChild(dnsLink)
}

// 在 DOM 加载前就预连接
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', preconnectToAPI)
} else {
  preconnectToAPI()
}

// 配置 axios
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理响应
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('API 错误:', error.response.status, error.response.data)
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误:', error.request)
    } else {
      // 其他错误
      console.error('请求错误:', error.message)
    }
    return Promise.reject(error)
  }
)

const app: App = createApp(App_)

// 使用 provide 提供 API 实例
app.provide('api', api)

// 保留 globalProperties 以兼容现有代码
app.config.globalProperties.$api = api

app.mount('#app')

