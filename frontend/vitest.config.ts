import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import type { PluginOption } from 'vite'

export default defineConfig({
  plugins: [vue() as PluginOption],
  test: {
    // 启用全局 API（describe, it, expect 等）
    globals: true,
    // 测试环境
    environment: 'jsdom',
    // 测试文件匹配模式
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // 排除目录
    exclude: ['node_modules', 'dist'],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
    },
    // 设置超时时间
    testTimeout: 10000,
    // 模拟 DOM API
    deps: {
      inline: ['vue'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})

