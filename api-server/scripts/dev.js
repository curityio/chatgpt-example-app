#!/usr/bin/env node

const esbuild = require('esbuild');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;

const buildAndRun = async () => {
  try {
    // Kill existing server process
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }

    console.log('🔧 Building...');
    
    // Build with esbuild
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: 'dist/index.js',
      format: 'cjs', // Using CommonJS for Express server
      sourcemap: true,
      external: [] // Bundle everything for the Express server
    });

    console.log('✅ Build complete');
    
    // Start the server
    console.log('🚀 Starting server...');
    serverProcess = spawn('node', ['dist/index.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.log(`Server exited with code ${code}`);
      }
    });

  } catch (error) {
    console.error('❌ Build failed:', error);
  }
};

// Initial build and run
buildAndRun();

// Watch for changes
console.log('👀 Watching for changes...');
const watcher = chokidar.watch('src/**/*.ts', {
  ignoreInitial: true
});

watcher.on('change', (path) => {
  console.log(`📝 File changed: ${path}`);
  buildAndRun();
});

watcher.on('add', (path) => {
  console.log(`➕ File added: ${path}`);
  buildAndRun();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  if (serverProcess) {
    serverProcess.kill();
  }
  watcher.close();
  process.exit(0);
});