/**
 * API 缓存工具
 * 用于缓存 API 请求结果，加速首次数据加载
 */

/** 缓存数据结构 */
interface CacheData<T = unknown> {
  data: T
  timestamp: number
  ttl?: number
}

/** 缓存配置 */
interface CacheConfig {
  defaultTTL: number
  storagePrefix: string
  maxCacheSize: number
  permanentCacheKeys: string[]
  permanentTTL: number
}

// 内存缓存（快速访问）
const memoryCache = new Map<string, CacheData>()

// 缓存配置
const CACHE_CONFIG: CacheConfig = {
  // 默认缓存时间（毫秒）
  defaultTTL: 5 * 60 * 1000, // 5分钟
  // 使用 localStorage 的缓存键前缀
  storagePrefix: 'hijot-api-cache-',
  // 最大缓存条目数
  maxCacheSize: 50,
  // 永不过期的缓存键列表（这些缓存不会被自动清理）
  permanentCacheKeys: [
    '/todo/stats?{}',
    '/config?{}',
  ],
  // 永不过期的 TTL 值
  permanentTTL: Number.MAX_SAFE_INTEGER,
}

/**
 * 生成缓存键
 */
function generateCacheKey(url: string, params: Record<string, unknown> = {}): string {
  const paramsStr = JSON.stringify(params)
  return `${url}?${paramsStr}`
}

/**
 * 从 localStorage 获取缓存
 */
function getStorageCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_CONFIG.storagePrefix + key)
    if (!cached) return null

    const { data, timestamp, ttl } = JSON.parse(cached) as CacheData<T> & { ttl: number }
    
    // 如果是永不过期的缓存，直接返回
    if (CACHE_CONFIG.permanentCacheKeys.includes(key)) {
      return data
    }

    const now = Date.now()

    // 检查是否过期
    if (now - timestamp > ttl) {
      localStorage.removeItem(CACHE_CONFIG.storagePrefix + key)
      return null
    }

    return data
  } catch (error) {
    console.error('读取缓存失败:', error)
    return null
  }
}

/**
 * 保存到 localStorage
 */
function setStorageCache<T>(key: string, data: T, ttl: number = CACHE_CONFIG.defaultTTL): void {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    localStorage.setItem(CACHE_CONFIG.storagePrefix + key, JSON.stringify(cacheData))

    // 清理过期缓存
    cleanupExpiredCache()
  } catch (error) {
    // localStorage 可能已满，尝试清理后重试
    if ((error as Error).name === 'QuotaExceededError') {
      cleanupExpiredCache()
      try {
        const cacheData = {
          data,
          timestamp: Date.now(),
          ttl,
        }
        localStorage.setItem(CACHE_CONFIG.storagePrefix + key, JSON.stringify(cacheData))
      } catch (retryError) {
        console.warn('缓存存储失败，已清理过期缓存后仍无法存储:', retryError)
      }
    } else {
      console.error('保存缓存失败:', error)
    }
  }
}

/**
 * 清理过期缓存
 */
function cleanupExpiredCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_CONFIG.storagePrefix))
    const now = Date.now()

    cacheKeys.forEach(key => {
      try {
        // 提取缓存键（去掉前缀）
        const cacheKey = key.replace(CACHE_CONFIG.storagePrefix, '')
        
        // 跳过永不过期的缓存
        if (CACHE_CONFIG.permanentCacheKeys.includes(cacheKey)) {
          return
        }

        const cached = localStorage.getItem(key)
        if (!cached) return

        const { timestamp, ttl } = JSON.parse(cached) as { timestamp: number; ttl: number }
        if (now - timestamp > ttl) {
          localStorage.removeItem(key)
        }
      } catch {
        // 如果解析失败，检查是否是永不过期缓存，如果不是则删除
        const cacheKey = key.replace(CACHE_CONFIG.storagePrefix, '')
        if (!CACHE_CONFIG.permanentCacheKeys.includes(cacheKey)) {
          localStorage.removeItem(key)
        }
      }
    })

    // 如果缓存条目过多，删除最旧的
    const remainingKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_CONFIG.storagePrefix))
      .map(key => {
        try {
          const cacheKey = key.replace(CACHE_CONFIG.storagePrefix, '')
          // 跳过永不过期的缓存
          if (CACHE_CONFIG.permanentCacheKeys.includes(cacheKey)) {
            return null
          }
          
          const cached = localStorage.getItem(key)
          if (!cached) return null
          const { timestamp } = JSON.parse(cached) as { timestamp: number }
          return { key, timestamp }
        } catch {
          return null
        }
      })
      .filter((item): item is { key: string; timestamp: number } => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (remainingKeys.length > CACHE_CONFIG.maxCacheSize) {
      const toDelete = remainingKeys.slice(0, remainingKeys.length - CACHE_CONFIG.maxCacheSize)
      toDelete.forEach(({ key }) => localStorage.removeItem(key))
    }
  } catch (error) {
    console.error('清理缓存失败:', error)
  }
}

/**
 * 获取缓存数据
 * @param url - API URL
 * @param params - 请求参数
 * @param ttl - 缓存时间（毫秒）
 * @returns 缓存的数据，如果没有则返回 null
 */
export function getCache<T>(url: string, params: Record<string, unknown> = {}, ttl: number = CACHE_CONFIG.defaultTTL): T | null {
  const cacheKey = generateCacheKey(url, params)
  
  // 如果是永不过期的缓存，使用永不过期 TTL
  const isPermanent = CACHE_CONFIG.permanentCacheKeys.includes(cacheKey)
  const effectiveTTL = isPermanent ? CACHE_CONFIG.permanentTTL : ttl

  // 先检查内存缓存
  const memoryCached = memoryCache.get(cacheKey)
  if (memoryCached) {
    const { data, timestamp } = memoryCached
    const now = Date.now()
    if (isPermanent || now - timestamp <= effectiveTTL) {
      return data as T
    } else {
      memoryCache.delete(cacheKey)
    }
  }

  // 检查 localStorage 缓存
  const storageCached = getStorageCache<T>(cacheKey)
  if (storageCached) {
    // 同时更新内存缓存
    memoryCache.set(cacheKey, {
      data: storageCached,
      timestamp: Date.now(),
    })
    return storageCached
  }

  return null
}

/**
 * 设置缓存数据
 * @param url - API URL
 * @param params - 请求参数
 * @param data - 要缓存的数据
 * @param ttl - 缓存时间（毫秒）
 */
export function setCache<T>(url: string, params: Record<string, unknown> = {}, data: T, ttl: number = CACHE_CONFIG.defaultTTL): void {
  const cacheKey = generateCacheKey(url, params)

  // 更新内存缓存
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  })

  // 更新 localStorage 缓存
  setStorageCache(cacheKey, data, ttl)
}

/**
 * 清除指定缓存
 * @param url - API URL
 * @param params - 请求参数
 */
export function clearCache(url: string, params: Record<string, unknown> = {}): void {
  const cacheKey = generateCacheKey(url, params)
  memoryCache.delete(cacheKey)
  localStorage.removeItem(CACHE_CONFIG.storagePrefix + cacheKey)
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  memoryCache.clear()
  const keys = Object.keys(localStorage)
  keys
    .filter(key => key.startsWith(CACHE_CONFIG.storagePrefix))
    .forEach(key => localStorage.removeItem(key))
}

/** 缓存请求配置 */
interface CachedRequestOptions {
  ttl?: number
  useCache?: boolean
  cacheKey?: string | null
}

/** 缓存请求结果 */
interface CachedRequestResult<T> {
  data: T
  fromCache: boolean
  expired?: boolean
}

/**
 * 创建带缓存的 axios 请求函数
 * @param apiCall - 原始的 API 调用函数
 * @param options - 配置选项
 * @returns 带缓存的请求函数
 */
export function createCachedRequest<T>(
  apiCall: (url: string, config?: Record<string, unknown>) => Promise<{ data: T }>,
  options: CachedRequestOptions = {}
): (url: string, config?: Record<string, unknown>) => Promise<CachedRequestResult<T>> {
  const {
    ttl = CACHE_CONFIG.defaultTTL,
    useCache = true,
    cacheKey = null,
  } = options

  return async (url: string, config: Record<string, unknown> = {}): Promise<CachedRequestResult<T>> => {
    const params = (config.params || {}) as Record<string, unknown>
    const key = cacheKey || url

    // 如果启用缓存，先检查缓存
    if (useCache) {
      const cached = getCache<T>(key, params, ttl)
      if (cached !== null) {
        // 返回缓存数据，同时异步更新
        Promise.resolve(apiCall(url, config)).then(response => {
          setCache(key, params, response.data, ttl)
        }).catch(() => {
          // 更新失败不影响已返回的缓存数据
        })
        return { data: cached, fromCache: true }
      }
    }

    // 没有缓存或缓存过期，发起请求
    try {
      const response = await apiCall(url, config)
      const data = response.data

      // 保存到缓存
      if (useCache) {
        setCache(key, params, data, ttl)
      }

      return { data, fromCache: false }
    } catch (error) {
      // 如果请求失败，尝试返回过期缓存（如果有）
      if (useCache) {
        const expiredCache = getCache<T>(key, params, ttl * 2) // 允许使用过期缓存
        if (expiredCache !== null) {
          console.warn('请求失败，使用过期缓存:', error)
          return { data: expiredCache, fromCache: true, expired: true }
        }
      }
      throw error
    }
  }
}

/** 预加载请求配置 */
interface PreloadRequest {
  url: string
  params?: Record<string, unknown>
  ttl?: number
}

/** 预加载结果 */
interface PreloadResult<T> {
  url: string
  data: T | null
  fromCache: boolean
}

/**
 * 预加载数据
 * @param requests - 请求数组 [{url, params, ttl}]
 */
export async function preloadData<T>(requests: PreloadRequest[] = []): Promise<PreloadResult<T>[]> {
  const promises = requests.map(({ url, params = {}, ttl }) => {
    const cached = getCache<T>(url, params, ttl)
    if (cached !== null) {
      return Promise.resolve({ url, data: cached, fromCache: true })
    }
    return Promise.resolve({ url, data: null, fromCache: false })
  })

  return Promise.all(promises)
}

