/**
 * 格式化工具函数
 * 统一管理日期、时间等格式化逻辑
 */

/**
 * 格式化时间戳为 MM-DD HH:mm 格式
 * @param timestamp - 时间戳
 * @returns 格式化后的时间字符串
 */
export function formatTime(timestamp: number | null | undefined): string {
  if (!timestamp && timestamp !== 0) return '--'
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

/**
 * 格式化时间戳为完整日期时间 YYYY-MM-DD HH:mm 格式
 * @param timestamp - 时间戳
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp && timestamp !== 0) return '--'
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 格式化数字为两位字符串
 * @param val - 数字
 * @returns 两位字符串
 */
export function padZero(val: number): string {
  return String(val).padStart(2, '0')
}

/**
 * 获取下一个整点的时间戳
 * @returns 下一个整点的时间戳
 */
export function getNextHourTimestamp(): number {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date.getTime()
}

/**
 * 判断时间戳是否已过期（早于当前时间）
 * @param timestamp - 时间戳
 * @returns 是否过期
 */
export function isExpired(timestamp: number): boolean {
  return timestamp < Date.now()
}

/**
 * 从 HTML 内容中提取纯文本标题
 * @param html - HTML 内容
 * @param fallback - 默认值
 * @returns 提取的标题
 */
export function extractTitleFromHtml(html: string = '', fallback: string = '随心记'): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text || fallback
}

