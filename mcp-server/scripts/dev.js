#!/usr/bin/env node

import esbuild from 'esbuild';
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import path from 'path';

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
      format: 'esm',
      packages: 'external', // Don't bundle any node_modules
      sourcemap: true
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