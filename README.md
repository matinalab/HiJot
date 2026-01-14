# HiJot

<p align="center">
  <img src="frontend/build/icon.png" width="120" alt="HiJot Logo">
</p>

<p align="center">
  一个轻量级桌面悬浮球工具，提供待办事项管理和随笔记录功能
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33.x-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js" alt="Vue">
  <img src="https://img.shields.io/badge/Nest.js-10.x-E0234E?logo=nestjs" alt="Nest.js">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

> 本项目设计灵感来源于 [HiLoop](https://github.com/baday19/HiLoop)，感谢原作者的开源分享。

---

## ✨ 功能特性

### 🎯 悬浮球
- 桌面常驻悬浮球，实时显示待办统计（过期数量 : 待处理数量）
- 支持拖拽移动位置
- 鼠标悬停展开功能菜单
- 可配置透明度和主题颜色
- 支持置顶/取消置顶
- 有过期任务时悬浮球闪烁提醒

### 📝 待办事项
- 创建、编辑、删除待办
- 设置截止时间
- 过期任务高亮显示
- 完成/恢复状态切换
- 系统通知提醒（可选）
- 双击快速编辑

### ✍️ 随笔记录
- 富文本编辑，支持图片
- 标题自动提取
- 展开/收起内容预览
- 快捷键保存（Ctrl + Enter）

### ⚙️ 系统功能
- 系统托盘常驻，点击显示/隐藏悬浮球
- 单实例运行，防止重复启动
- 数据本地存储，安全可靠
- 支持 Windows / macOS / Linux

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|:---:|:---:|:---|
| 桌面框架 | Electron 33.x | 跨平台桌面应用 |
| 前端框架 | Vue 3.5 | Composition API |
| 构建工具 | Vite 6.x | 快速热更新 |
| 后端框架 | Nest.js 10.x | 模块化架构 |
| ORM | TypeORM 0.3.x | 数据库操作 |
| 数据库 | SQLite (better-sqlite3) | 轻量级本地存储 |
| 语言 | TypeScript 5.x | 类型安全 |
| 样式 | SCSS | 组件化样式 |
| 打包 | electron-builder | 多平台打包 |

---

## 📁 项目结构

```
HiJot/
├── frontend/                    # Electron + Vue3 前端
│   ├── build/                   # 打包资源（图标等）
│   ├── dist/                    # Vite 构建产物
│   ├── dist-electron/           # Electron 打包产物
│   ├── src/
│   │   ├── assets/              # 静态资源
│   │   ├── components/          # 通用组件
│   │   ├── composables/         # 组合式函数
│   │   ├── css/                 # 全局样式
│   │   ├── types/               # TypeScript 类型定义
│   │   ├── utils/               # 工具函数
│   │   ├── views/               # 页面组件
│   │   ├── App.vue              # 根组件
│   │   ├── main.ts              # 渲染进程入口
│   │   └── preload.js           # 预加载脚本
│   ├── main.js                  # Electron 主进程
│   ├── electron-builder.yml     # 打包配置
│   ├── vite.config.ts           # Vite 配置
│   └── package.json
│
├── backend/                     # Nest.js 后端
│   ├── src/
│   │   ├── common/              # 公共模块
│   │   │   ├── dto/             # 通用 DTO
│   │   │   ├── filters/         # 异常过滤器
│   │   │   ├── interceptors/    # 拦截器
│   │   │   └── interfaces/      # 接口定义
│   │   ├── database/
│   │   │   └── entities/        # 数据库实体
│   │   ├── modules/
│   │   │   ├── todo/            # 待办事项模块
│   │   │   ├── essay/           # 随笔模块
│   │   │   └── config/          # 配置模块
│   │   ├── app.module.ts        # 根模块
│   │   └── main.ts              # 后端入口
│   ├── hijot.db                 # SQLite 数据库文件
│   └── package.json
│
├── start.js                     # 开发环境一键启动脚本
├── package.json                 # 根目录配置
└── README.md
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 或 **yarn**

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/HiJot.git
cd HiJot

# 安装根目录依赖
npm install

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 开发模式

```bash
# 方式一：在根目录一键启动（推荐）
npm start

# 方式二：分别启动各服务
npm run start:backend   # 启动 Nest.js 后端（热重载）
npm run start:vite      # 启动 Vite 开发服务器
npm run start:electron  # 启动 Electron 窗口
```

一键启动会同时运行：
- 🟢 **Backend** - Nest.js 后端服务 (端口 3000)
- 🟡 **Vite** - 前端开发服务器 (端口 5173)
- 🟣 **Electron** - 桌面窗口（延迟 3 秒启动）

### 打包构建

```bash
cd frontend

# 完整生产构建（推荐）
npm run dist:prod

# 仅构建前端
npm run build

# 仅打包 Electron（需先构建前端和后端）
npm run dist
```

打包产物位于 `frontend/dist-electron/` 目录：
- **Windows**: `HiJot Setup x.x.x.exe`
- **macOS**: `HiJot-x.x.x.dmg`
- **Linux**: `HiJot-x.x.x.AppImage`

---

## ⚙️ 配置说明

### 悬浮球配置

| 配置项 | 说明 | 默认值 |
|:---:|:---|:---:|
| 透明度 | 悬浮球透明度 (0.2 - 1.0) | 0.8 |
| 主颜色 | 主题颜色 | #49ce95 |
| 功能开关 | 悬停展开的功能项 | 待办、随笔 |
| 系统提醒 | 过期任务系统通知 | 关闭 |

### 数据存储

- **开发环境**: 数据库位于 `backend/hijot.db`
- **生产环境**: 数据库位于用户数据目录
  - Windows: `%APPDATA%/HiJot/hijot.db`
  - macOS: `~/Library/Application Support/HiJot/hijot.db`
  - Linux: `~/.config/HiJot/hijot.db`

---

## 🔧 开发指南

### 添加新模块

1. 在 `backend/src/modules/` 创建新模块目录
2. 创建 `*.module.ts`、`*.controller.ts`、`*.service.ts`
3. 在 `app.module.ts` 中导入新模块
4. 在 `frontend/src/views/` 创建对应页面组件

### 代码规范

```bash
# 后端代码格式化
cd backend && npm run format

# 前端类型检查
cd frontend && npm run typecheck

# 运行测试
cd frontend && npm run test
```

---

## 📝 更新日志

### v1.0.0
- 🎉 初始版本发布
- ✅ 悬浮球基础功能
- ✅ 待办事项 CRUD
- ✅ 随笔记录功能
- ✅ 配置管理
- ✅ 系统托盘
- ✅ Windows 打包支持

---

## 🤝 致谢

- [HiLoop](https://github.com/baday19/HiLoop) - 项目设计参考与灵感来源
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Nest.js](https://nestjs.com/) - Node.js 服务端框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具

---

## 📄 License

[MIT](LICENSE) © HiJot

---

<p align="center">
  如果这个项目对你有帮助，欢迎 ⭐ Star 支持一下！
</p>
