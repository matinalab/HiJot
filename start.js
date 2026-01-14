const { spawn } = require('child_process');
const path = require('path');

// 进程列表
const processes = [];

// 颜色代码
const colors = {
  backend: '\x1b[36m',  // 青色
  vite: '\x1b[33m',     // 黄色
  electron: '\x1b[35m', // 紫色
  reset: '\x1b[0m'
};

// 启动进程
function startProcess(name, command, args, cwd) {
  const proc = spawn(command, args, {
    cwd: cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors[name]}[${name}]${colors.reset} ${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${colors[name]}[${name}]${colors.reset} ${line}`);
      }
    });
  });

  proc.on('close', (code) => {
    // console.log(`${colors[name]}[${name}]${colors.reset} 进程退出，代码: ${code}`);
  });

  processes.push(proc);
  return proc;
}

// 清理所有进程
function cleanup() {
  processes.forEach(proc => {
    if (!proc.killed) {
      // Windows 上使用 taskkill 强制终止进程树
      spawn('taskkill', ['/pid', proc.pid, '/f', '/t'], { shell: true });
    }
  });
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

// 监听退出信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 启动所有服务
const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('启动 HiJot 开发环境...\n');

// 启动 backend (nest watch)
startProcess('backend', 'npx', ['nest', 'start', '--watch'], backendDir);

// 启动 vite
startProcess('vite', 'npx', ['vite'], frontendDir);

// 启动 electron (延迟启动，等待 vite 就绪)
setTimeout(() => {
  startProcess('electron', 'npx', ['cross-env', 'NODE_ENV=development', 'electron', '.'], frontendDir);
}, 3000);

