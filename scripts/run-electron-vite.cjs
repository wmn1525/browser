#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { dirname, join } = require('node:path');

const command = process.argv[2];

if (!command) {
  console.error('Missing electron-vite command.');
  process.exit(1);
}

const electronViteRoot = dirname(require.resolve('electron-vite/package.json'));
const electronViteBin = join(electronViteRoot, 'bin', 'electron-vite.js');
const childEnv = { ...process.env };

// 避免外部终端把 Electron 强制切到 Node 模式，导致主进程拿不到 Electron API。
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(process.execPath, [electronViteBin, command, ...process.argv.slice(3)], {
  env: childEnv,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
    return;
  }

  process.exit(code ?? 0);
});
