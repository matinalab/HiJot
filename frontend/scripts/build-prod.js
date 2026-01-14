/**
 * 生产环境打包脚本
 * 用于创建只包含生产依赖的 node_modules 目录
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '../../backend');
const prodDir = path.resolve(backendDir, 'prod_build');
const prodModulesDir = path.resolve(prodDir, 'node_modules');

console.log('========================================');
console.log('开始准备生产环境依赖...');
console.log('========================================\n');

// 1. 清理旧的生产依赖目录
console.log('[1/4] 清理旧的生产依赖目录...');
if (fs.existsSync(prodDir)) {
  fs.rmSync(prodDir, { recursive: true, force: true });
}
fs.mkdirSync(prodDir, { recursive: true });

// 2. 复制 package.json 和 package-lock.json
console.log('[2/4] 复制 package.json 和 package-lock.json...');
fs.copyFileSync(
  path.join(backendDir, 'package.json'),
  path.join(prodDir, 'package.json')
);
fs.copyFileSync(
  path.join(backendDir, 'package-lock.json'),
  path.join(prodDir, 'package-lock.json')
);

// 3. 安装生产依赖
console.log('[3/4] 安装生产依赖 (npm ci --omit=dev)...');
console.log('    这可能需要一些时间，请耐心等待...\n');

try {
  execSync('npm ci --omit=dev', {
    cwd: prodDir,
    stdio: 'inherit',
    env: { ...process.env, npm_config_optional: 'false' }
  });
} catch (error) {
  console.error('\n安装依赖失败！');
  console.error(error.message);
  process.exit(1);
}

// 4. 重新构建 better-sqlite3 原生模块（如果需要）
console.log('\n[4/4] 检查并重建原生模块...');
const betterSqlite3Dir = path.join(prodModulesDir, 'better-sqlite3');
if (fs.existsSync(betterSqlite3Dir)) {
  console.log('    重建 better-sqlite3...');
  try {
    execSync('npm rebuild better-sqlite3', {
      cwd: prodDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.warn('    警告: better-sqlite3 重建失败，可能需要手动处理');
  }
}

// 5. 统计结果
console.log('\n========================================');
console.log('生产依赖准备完成！');
console.log('========================================');

// 计算目录大小
function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += fs.statSync(filePath).size;
      }
    }
  } catch (e) {
    // ignore
  }
  return size;
}

const prodSize = getDirSize(prodModulesDir);
console.log(`\n生产依赖目录大小: ${(prodSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`目录位置: ${prodModulesDir}`);
console.log('\n现在可以运行 electron-builder 进行打包了！');

