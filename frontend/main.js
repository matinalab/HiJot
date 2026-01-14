const { app, Menu, BrowserWindow, ipcMain, Tray, nativeImage, Notification } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

// 隐藏未处理的 Promise 拒绝警告
process.on('unhandledRejection', () => {
  // 静默处理未捕获的 Promise 拒绝
});

// ============================================
// 配置常量
// ============================================
const CONFIG = {
  floatBall: {
    width: 76,
    height: 36,
  },
  todo: {
    width: 350,
    height: 500,
  },
  essay: {
    width: 350,
    height: 500,
  },
  config: {
    width: 350,
    height: 500,
  },
  viteDevServer: 'http://localhost:5173',
  backendPort: 3000,
  iconPath: path.join(__dirname, 'src/assets/note.png'),
  preloadPath: path.join(__dirname, 'src/preload.js'),
};

// ============================================
// 后端服务管理
// ============================================
let backendProcess = null;

/**
 * 获取后端路径
 */
function getBackendPath() {
  if (app.isPackaged) {
    // 打包后，后端在 resources/backend 目录
    return path.join(process.resourcesPath, 'backend');
  } else {
    // 开发环境，后端在上级目录
    return path.join(__dirname, '..', 'backend');
  }
}

/**
 * 获取用户数据目录下的数据库路径
 */
function getDatabasePath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'hijot.db');
}

/**
 * 获取 Node.js 可执行文件路径
 */
function getNodePath() {
  if (app.isPackaged) {
    // 打包后，使用系统 Node.js 或内嵌的 Node.js
    // 优先检查是否有内嵌的 Node.js
    const embeddedNode = path.join(process.resourcesPath, 'node', process.platform === 'win32' ? 'node.exe' : 'node');
    const fs = require('fs');
    if (fs.existsSync(embeddedNode)) {
      return embeddedNode;
    }
    // 回退到系统 Node.js
    return process.platform === 'win32' ? 'node.exe' : 'node';
  } else {
    // 开发环境，使用系统 Node.js
    return 'node';
  }
}

/**
 * 启动后端服务
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    const mainFile = path.join(backendPath, 'dist', 'main.js');
    const dbPath = getDatabasePath();
    const nodePath = getNodePath();
    
    console.log(`[HiJot] Node.js 路径: ${nodePath}`);
    console.log(`[HiJot] 后端路径: ${mainFile}`);
    console.log(`[HiJot] 数据库路径: ${dbPath}`);
    
    // 使用 node 运行后端
    backendProcess = spawn(nodePath, [mainFile], {
      cwd: backendPath,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: CONFIG.backendPort.toString(),
        DB_PATH: dbPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      // Windows 下隐藏控制台窗口
      windowsHide: true,
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      console.error('[HiJot] 后端启动失败:', err);
      reject(err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`[HiJot] 后端进程退出，代码: ${code}`);
      backendProcess = null;
    });

    // 等待后端服务就绪
    waitForServer(`http://localhost:${CONFIG.backendPort}/api`, 30)
      .then(() => {
        console.log('[HiJot] 后端服务已就绪');
        resolve();
      })
      .catch(reject);
  });
}

/**
 * 停止后端服务
 */
function stopBackend() {
  if (backendProcess) {
    console.log('[HiJot] 停止后端服务...');
    if (process.platform === 'win32') {
      // Windows 下使用 taskkill 强制结束进程树
      spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t'], { windowsHide: true });
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}

// ============================================
// 全局状态
// ============================================
const windows = {
  floatBall: null,
  todo: null,
  essay: null,
  config: null,
};

let tray = null;
let viteServerReady = false;
let topFlag = true;

// 设置应用用户模型ID
app.setName('HiJot')
if (process.platform === 'win32') {
  app.setAppUserModelId('com.hijot.app');
}

// ============================================
// 单实例锁
// ============================================
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    const allWins = BrowserWindow.getAllWindows();
    if (allWins.length) {
      const mainWin = allWins[0];
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    } else {
      windows.floatBall = createWindow('floatBall');
    }
  });
}

// 判断是否为开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ============================================
// 工具函数
// ============================================

/**
 * 等待 Vite 开发服务器启动
 */
function waitForServer(url, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = () => {
      attempts++;
      const interval = attempts <= 10 ? 500 : 1000;
      
      const req = http.get(url, (res) => {
        req.destroy();
        viteServerReady = true;
        console.log(`[HiJot] Vite服务器已就绪，共尝试 ${attempts} 次`);
        resolve();
      });

      req.on('error', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`等待服务器启动超时: ${url}`));
        } else {
          if (attempts % 10 === 0) {
            console.log(`[HiJot] 等待Vite服务器启动... (${attempts}/${maxAttempts})`);
          }
          setTimeout(checkServer, interval);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`等待服务器启动超时: ${url}`));
        } else {
          setTimeout(checkServer, interval);
        }
      });
    };

    checkServer();
  });
}

/**
 * 通用 webPreferences 配置
 */
function getWebPreferences(options = {}) {
  return {
    nodeIntegration: true,
    contextIsolation: false,
    preload: CONFIG.preloadPath,
    ...options,
  };
}

/**
 * 开发环境加载 URL
 */
function loadDevURL(win, url, options = {}) {
  const { openDevTools = false, maxRetries = 30, retryInterval = 1000 } = options;
  
  if (openDevTools) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
  
  if (viteServerReady) {
    win.loadURL(url);
    return;
  }
  
  waitForServer(CONFIG.viteDevServer, 60).then(() => {
    win.loadURL(url);
  }).catch((err) => {
    console.error('[HiJot] Vite服务器启动超时:', err.message);
    win.loadURL(url);
  });
  
  let retryCount = 0;
  win.webContents.on('did-fail-load', (event, errorCode) => {
    if (errorCode === -106 || errorCode === -102) {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[HiJot] 加载失败，重试中... (${retryCount}/${maxRetries})`);
        setTimeout(() => win.loadURL(url), retryInterval);
      } else {
        console.error('[HiJot] 多次重试失败，请检查 Vite 开发服务器');
      }
    }
  });
}

// ============================================
// 窗口工厂
// ============================================

/**
 * 窗口配置映射
 */
const windowConfigs = {
  floatBall: {
    width: CONFIG.floatBall.width,
    height: CONFIG.floatBall.height,
    type: 'toolbar',
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    show: true,
    webPreferences: { enableRemoteModule: true },
    hash: '',
    devTools: false,
  },
  todo: {
    width: CONFIG.todo.width,
    height: CONFIG.todo.height,
    frame: true,
    resizable: true,
    transparent: false,
    alwaysOnTop: false,
    show: true,
    hash: 'todo',
    devTools: true,
    removeMenu: true,
  },
  essay: {
    width: CONFIG.essay.width,
    height: CONFIG.essay.height,
    frame: true,
    resizable: true,
    transparent: false,
    alwaysOnTop: false,
    show: true,
    hash: 'essay',
    devTools: false,
    removeMenu: true,
  },
  config: {
    width: CONFIG.config.width,
    height: CONFIG.config.height,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: false,
    show: true,
    hash: 'config',
    devTools: false,
    removeMenu: true,
  },
};

/**
 * 创建窗口工厂函数
 */
function createWindow(type, parentWin = null) {
  const config = windowConfigs[type];
  if (!config) {
    console.error(`[HiJot] 未知窗口类型: ${type}`);
    return null;
  }

  const winOptions = {
    width: config.width,
    height: config.height,
    frame: config.frame,
    resizable: config.resizable,
    transparent: config.transparent,
    alwaysOnTop: config.alwaysOnTop,
    show: config.show,
    icon: CONFIG.iconPath,
    webPreferences: getWebPreferences(config.webPreferences || {}),
  };

  // 配置窗口特殊处理
  if (type === 'config' && parentWin) {
    winOptions.parent = parentWin;
    winOptions.modal = true;
  }

  if (config.type) {
    winOptions.type = config.type;
  }

  const win = new BrowserWindow(winOptions);

  // 加载内容
  if (isDev) {
    const url = config.hash 
      ? `${CONFIG.viteDevServer}#${config.hash}` 
      : CONFIG.viteDevServer;
    loadDevURL(win, url, { openDevTools: config.devTools && isDev });
  } else {
    if (config.hash) {
      win.loadFile(path.join(__dirname, 'dist/index.html'), { hash: config.hash });
    } else {
      win.loadFile(path.join(__dirname, 'dist/index.html'));
    }
  }

  // 移除菜单
  if (config.removeMenu) {
    win.setMenu(null);
  }

  return win;
}

// ============================================
// 系统托盘
// ============================================
function createTray() {
  const icon = nativeImage.createFromPath(CONFIG.iconPath);
  if (process.platform === 'win32') {
    icon.setTemplateImage(false);
  }
  
  tray = new Tray(icon);
  tray.setToolTip('HiJot');
  
  const contextMenu = createContextMenu();
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (windows.floatBall) {
      if (windows.floatBall.isVisible()) {
        windows.floatBall.hide();
      } else {
        windows.floatBall.show();
      }
    } else {
      windows.floatBall = createWindow('floatBall');
    }
  });
}

/**
 * 创建右键菜单
 */
function createContextMenu() {
  const menuTemplate = [
    {
      label: "配置",
      click: () => {
        if (windows.config) {
          windows.config.close();
          windows.config = null;
        }
        windows.config = createWindow('config');
        windows.config.on("close", () => {
          windows.config = null;
        });
      },
    },
    {
      label: "置顶/取消",
      click: () => {
        topFlag = !topFlag;
        if (windows.floatBall) {
          windows.floatBall.setAlwaysOnTop(topFlag);
        }
      },
    },
  ];

  // 开发环境添加开发者工具选项
  if (isDev) {
    menuTemplate.push({
      label: "开发者工具",
      click: () => {
        if (windows.floatBall) {
          windows.floatBall.webContents.openDevTools({ mode: "detach" });
        }
      },
    });
  }

  menuTemplate.push(
    {
      label: "退出",
      click: () => {
        app.quit();
      },
    }
  );

  return Menu.buildFromTemplate(menuTemplate);
}

// ============================================
// 应用生命周期
// ============================================
app.on("ready", async () => {
  // 生产环境启动后端服务
  if (!isDev) {
    console.log('[HiJot] 生产环境启动，正在启动后端服务...');
    try {
      await startBackend();
      console.log('[HiJot] 后端服务启动成功');
    } catch (err) {
      console.error('[HiJot] 后端服务启动失败:', err.message);
    }
  } else {
    console.log('[HiJot] 开发环境启动，等待Vite服务器...');
    try {
      await waitForServer(CONFIG.viteDevServer, 60);
      console.log('[HiJot] 创建悬浮球窗口...');
    } catch (err) {
      console.error('[HiJot] 等待Vite服务器超时:', err.message);
    }
  }
  
  windows.floatBall = createWindow('floatBall');
  createTray();
});

app.on("window-all-closed", () => {
  // 保持应用运行（托盘模式）
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windows.floatBall = createWindow('floatBall');
  }
});

// ============================================
// IPC 事件处理
// ============================================

// 将消息广播到所有已存在的窗口
const broadcastToAll = (channel, data) => {
  Object.values(windows)
    .filter(win => win && !win.isDestroyed())
    .forEach(win => {
      win.webContents.send(channel, data)
    })
}

// 显示待办窗口
ipcMain.on("showTodo", () => {
  if (windows.todo) {
    windows.todo.close();
    windows.todo = null;
  }
  windows.todo = createWindow('todo');
  windows.todo.on("close", () => {
    windows.todo = null;
  });
});

// 显示随笔窗口
ipcMain.on("showEssay", () => {
  if (windows.essay) {
    windows.essay.close();
    windows.essay = null;
  }
  windows.essay = createWindow('essay');
  windows.essay.on("close", () => {
    windows.essay = null;
  });
});

// 显示配置窗口
ipcMain.on("showConfig", () => {
  if (windows.config) {
    windows.config.focus();
    return;
  }
  windows.config = createWindow('config', windows.floatBall);
  windows.config.on("close", () => {
    windows.config = null;
  });
});

// 移动悬浮球
ipcMain.on("ballWindowMove", (e, data) => {
  if (windows.floatBall) {
    windows.floatBall.setBounds({
      x: data.x,
      y: data.y,
      width: CONFIG.floatBall.width,
      height: CONFIG.floatBall.height,
    });
  }
});

// 打开右键菜单
ipcMain.on("openMenu", () => {
  const contextMenu = createContextMenu();
  contextMenu.popup({});
});

// 更新配置
ipcMain.on("updateConfig", (_, config) => {
  if (windows.floatBall) {
    windows.floatBall.webContents.send("config-updated", config);
  }
});

// 关闭配置窗口
ipcMain.on('closeConfig', () => {
  if (windows.config) {
    windows.config.close();
    windows.config = null;
  }
});

// 转发待办统计更新
ipcMain.on('stats-updated', (_event, stats) => {
  // 通知所有窗口
  broadcastToAll('stats-updated', stats);
});

// 转发待办提醒事件
ipcMain.on('todo-reminder', (_event, data) => {
  // 通知所有窗口
  broadcastToAll('todo-reminder', data);
});

// 待办数据更新事件
ipcMain.on('todo-updated', (_event, data) => {
  // 通知所有窗口
  broadcastToAll('todo-updated', data);
});

// 通用系统通知事件
ipcMain.on('show-notification', (_event, data) => {
  if (Notification.isSupported() && data) {
    const notification = new Notification({
      title: data.title || 'HiJot',
      body: data.content || '',
      icon: CONFIG.iconPath,
      silent: false
    });
    
    // 点击通知时打开待办窗口
    notification.on('click', () => {
      if (windows.todo) {
        windows.todo.focus();
      } else {
        windows.todo = createWindow('todo');
        windows.todo.on('close', () => {
          windows.todo = null;
        });
      }
    });
    
    notification.show();
  }
});

// ============================================
// 进程清理
// ============================================
const cleanExit = () => {
  // 停止后端服务
  stopBackend();
  
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(win => {
    win.destroy();
  });
  
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  app.quit();
  
  if (process.platform === 'win32') {
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, cleanExit);
});

// 应用退出前清理
app.on('before-quit', () => {
  stopBackend();
});

app.on('will-quit', () => {
  stopBackend();
});

