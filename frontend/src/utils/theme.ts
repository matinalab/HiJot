/**
 * 主题工具函数
 * 管理应用主题色和 CSS 变量
 */

const defaultMainColor = '#49ce95'

/**
 * 标准化十六进制颜色值
 * @param hex - 十六进制颜色值
 * @returns 标准化后的颜色值
 */
const normalizeHex = (hex: string | null | undefined): string => {
  if (!hex) return defaultMainColor
  const stripped = hex.replace('#', '')
  if (stripped.length === 3) {
    return `#${stripped.split('').map((ch) => ch + ch).join('')}`
  }
  return `#${stripped}`
}

/**
 * 获取主题色
 * @returns 主题色值
 */
export const getMainColor = (): string => {
  try {
    const storage = localStorage.getItem('hijot-config')
    if (!storage) return defaultMainColor
    const cfg = JSON.parse(storage) as { mainColor?: string }
    return normalizeHex(cfg.mainColor) || defaultMainColor
  } catch (e) {
    console.error('读取主题色失败', e)
    return defaultMainColor
  }
}

/**
 * 将十六进制颜色转换为 RGBA
 * @param hex - 十六进制颜色值
 * @param alpha - 透明度，默认 1
 * @returns RGBA 颜色字符串
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const full = normalizeHex(hex).replace('#', '')
  const num = parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * 调整颜色亮度
 * @param hex - 十六进制颜色值
 * @param amount - 调整量，正数变亮，负数变暗，取值建议 -1~1
 * @returns 调整后的颜色值
 */
export const adjustColor = (hex: string, amount: number = 0.1): string => {
  const full = normalizeHex(hex).replace('#', '')
  const num = parseInt(full, 16)
  const clamp = (v: number): number => Math.min(255, Math.max(0, v))
  const r = clamp(((num >> 16) & 255) + 255 * amount)
  const g = clamp(((num >> 8) & 255) + 255 * amount)
  const b = clamp((num & 255) + 255 * amount)
  const toHex = (v: number): string => v.toString(16).padStart(2, '0')
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`
}

/** CSS 变量对象类型 */
export interface CssVars {
  '--mainColor': string
  '--mainColorHover': string
  '--mainColorShadow': string
  '--mainColorShadowStrong': string
  '--mainColorFocus': string
  [key: `--${string}`]: string
}

/**
 * 构建 CSS 变量对象
 * @param mainColor - 主题色
 * @returns CSS 变量对象
 */
export const buildCssVars = (mainColor: string = defaultMainColor): CssVars => {
  const color = normalizeHex(mainColor)
  return {
    '--mainColor': color,
    '--mainColorHover': adjustColor(color, -0.1),
    '--mainColorShadow': hexToRgba(color, 0.4),
    '--mainColorShadowStrong': hexToRgba(color, 0.6),
    '--mainColorFocus': hexToRgba(color, 0.1),
  }
}

