const { BrowserWindow, screen } = require('electron');
const path = require('path');

// 创建悬浮球窗口
const createFloatBallWindow = (config) => {
  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    type: 'toolbar',
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    icon: path.join(__dirname, 'assets/time.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'views/FloatBall/index.html'));
  
  // 设置初始位置（右下角）
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(screenWidth - 150, screenHeight - 100);

  return win;
};

// 创建待办窗口
const createTodoWindow = () => {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const win = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 300,
    x: screenWidth - 400,
    y: screenHeight - 800,
    icon: path.join(__dirname, 'assets/time.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  win.loadFile(path.join(__dirname, 'views/Todo/index.html'));
  return win;
};

// 创建随笔窗口
const createEssayWindow = () => {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const win = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 300,
    x: screenWidth - 400,
    y: screenHeight - 800,
    icon: path.join(__dirname, 'assets/time.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  win.loadFile(path.join(__dirname, 'views/Essay/index.html'));
  return win;
};

// 创建配置窗口
const createConfigWindow = () => {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const win = new BrowserWindow({
    width: 300,
    height: 500,
    minWidth: 300,
    maxWidth: 300,
    x: screenWidth - 400,
    y: screenHeight - 800,
    icon: path.join(__dirname, 'assets/time.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  
  win.loadFile(path.join(__dirname, 'views/Config/index.html'));
  return win;
};

module.exports = {
  createFloatBallWindow,
  createTodoWindow,
  createEssayWindow,
  createConfigWindow,
};
