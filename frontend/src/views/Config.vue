<template>
  <div class="container">
    <div class="wrap">
      <div class="header">
        <span>⚙ 配置</span>
        <button class="close-btn" @click="close">✕</button>
      </div>
      <div class="content">
        <fieldset class="section">
          <legend>样式</legend>

          <div class="field">
            <span>透明度：</span>
            <input type="range" min="0.2" max="1" step="0.05" v-model.number="form.opacity" />
            <span class="opacity">{{ form.opacity }}</span>
          </div>

          <div class="field">
            <span>主颜色：</span>
            <input type="color" v-model="form.mainColor" />
          </div>
        </fieldset>
        <fieldset class="section">
          <legend>功能</legend>
          <div class="checkbox-group">
            <label>
              <input
                type="checkbox"
                value="todo"
                v-model="form.hoverFeatures"
                disabled
                :style="{'--accent': form.mainColor}"
              />
              待办
            </label>
            <label>
              <input
                type="checkbox"
                value="essay"
                v-model="form.hoverFeatures"
                :disabled="isLastSelected('essay')"
                :style="{'--accent': form.mainColor}"
              />
              随笔
            </label>
          </div>
        </fieldset>

        <fieldset class="section">
          <legend>提醒</legend>
          <div class="checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="form.systemNotification"
                :style="{'--accent': form.mainColor}"
              />
              系统提醒
            </label>
          </div>
        </fieldset>

      </div>

      <div class="footer">
        <button class="button" @click="save">保存</button>
        <button class="button" @click="reset">重置</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue'
import { getCache, setCache } from '../utils/apiCache'
import { showSuccess } from '../utils/toast'
import { sendIpc, isElectron } from '../utils/electron'
import { useApi } from '../composables/useApi'
import type { AppConfig } from '../types/api'

export default {
  name: 'Config',
  setup() {
    const { get, post } = useApi()
    
    const defaultConfig = {
      opacity: 0.8,
      mainColor: '#49ce95',
      subColor: '#E6F7FF',
      hoverFeatures: ['todo', 'essay'],
      systemNotification: false
    }
    const form = ref({ ...defaultConfig })
    const loading = ref(false)

    const loadConfig = async () => {
      // 优先从 localStorage 加载
      const storage = localStorage.getItem('hijot-config')
      if (storage) {
        try {
          const cfg = JSON.parse(storage)
          form.value = { ...defaultConfig, ...cfg }
        } catch (error) {
          console.error('解析本地配置失败:', error)
        }
      }

      // 尝试从后端获取最新配置
      try {
        // 先检查缓存
        const cached = getCache<AppConfig>('/config', {}, Number.MAX_SAFE_INTEGER)
        if (cached) {       
          form.value = { ...defaultConfig, ...cached }
          return
        }

        loading.value = true
        const response = await get<AppConfig>('/config', { showLoading: false, showError: false })
        if (response?.data) {
          const backendConfig = response.data
          form.value = { ...defaultConfig, ...backendConfig }
          localStorage.setItem('hijot-config', JSON.stringify(backendConfig))
          setCache('/config', {}, backendConfig, Number.MAX_SAFE_INTEGER)
        }
      } catch (error) {
        // 静默处理，使用本地配置
      } finally {
        loading.value = false
      }
    }

    const save = async () => {
      const config = { ...form.value }
      
      // 保存到本地存储
      localStorage.setItem('hijot-config', JSON.stringify(config))
      
      // 同步到后端
      try {
        await post('/config', config, { showLoading: false, showError: false })
        setCache('/config', {}, config, Number.MAX_SAFE_INTEGER)
      } catch (error) {
        // 静默处理，本地配置已保存
      }

      // 通知主进程更新配置
      const serializableConfig = JSON.parse(JSON.stringify(config))
      sendIpc('updateConfig', serializableConfig)
      sendIpc('closeConfig')
      
      showSuccess('配置已保存')
      
      // 非 Electron 环境下关闭窗口
      if (!isElectron()) {
        window.close()
      }
    }

    const reset = () => {
      form.value = { ...defaultConfig }
      save()
    }

    const close = () => {
      sendIpc('closeConfig')
      
      if (!isElectron()) {
        window.close()
      }
    }

    const isLastSelected = (key: string) => {
      const list = form.value.hoverFeatures || []
      return list.length === 1 && list.includes(key)
    }

    onMounted(loadConfig)

    return {
      form,
      loading,
      save,
      reset,
      close,
      isLastSelected
    }
  }
}
</script>

<style lang="scss" scoped>
@use '../css/components.scss' as *;

.container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent;
}

.wrap {
  width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: #f3f3f3;
  color: #333;
  border-radius: 12px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  backdrop-filter: blur(6px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-app-region: drag;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  padding: 10px;
}

.content {
  display: flex;
  flex-direction: column;
  overflow: auto;
  margin: 0 12px;
  padding: 10px;
  -webkit-app-region: no-drag;
  background: #f9f9f9;
}

.close-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  padding: 5px;
  line-height: 1;
  -webkit-app-region: no-drag;
  outline: none;
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;

  span,label {
    flex: none;
    font-size: 12px;
  }

  .opacity {
    text-align: end;
    min-width: 30px;
  }

  &:not(:last-child) {
    position: relative;
    padding-bottom: 5px;
    margin-bottom: 5px;

    &::after {
      position: absolute;
      content: '';
      left: 2px;
      bottom: 0;
      right: 2px;
      border-bottom: 1px solid #F4F6F9;
    }
  }

  input[type='range'] {
    width: 55%;
  }

  input[type='color'] {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 3px;

    &::-webkit-color-swatch-wrapper {
      padding: 0;
      border: none;
    }

    &::-webkit-color-swatch {
      border: none;
      border-radius: 2px;
    }
  }
}

.checkbox-group {
  display: flex;
  gap: 16px;
  padding: 6px 0 2px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    line-height: 1;
    color: #333;

    &.disabled {
      color: #999;
    }
  }

  input[type='checkbox'] {
    width: 14px;
    height: 14px;
    accent-color: var(--accent);
    cursor: pointer;

    &:disabled {
      accent-color: #cfcfcf;
      cursor: not-allowed;
    }
  }
}


.section {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  padding: 8px 12px 12px;
  margin-bottom: 12px;
  min-width: 0;

  legend {
    padding: 0 6px;
    font-size: 13px;
    color: #444;
    line-height: 1.4;
  }
}

.footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px;
  gap: 8px;
}

.button {
  padding: 5px 16px;
  border-radius: 3px;
  border: 1px solid #ccc;
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
  -webkit-app-region: no-drag;
}
</style>
