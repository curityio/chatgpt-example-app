import { spawn } from 'child_process';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;

function startServer() {
  if (serverProcess) {
    console.log('🔄 Restarting server...');
    serverProcess.kill();
  }

  console.log('🚀 Starting server...');
  serverProcess = spawn('node', ['dist/server.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Server error:', err);
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`🔄 Server exited with code ${code}, restarting...`);
      setTimeout(startServer, 1000);
    }
  });
}

function buildServer() {
  console.log('🔨 Building server...');
  const buildProcess = spawn('npm', ['run', 'build:server'], {
    stdio: 'inherit'
  });

  buildProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Server build complete');
      startServer();
    } else {
      console.error('❌ Server build failed');
    }
  });
}

// Initial build and start
buildServer();

// Watch for server file changes
const serverWatcher = chokidar.watch('src/server.ts', {
  ignored: /node_modules/,
  persistent: true
});

serverWatcher.on('change', () => {
  console.log('📝 Server file changed, rebuilding...');
  buildServer();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  if (serverProcess) {
    serverProcess.kill();
  }
  serverWatcher.close();
  process.exit(0);
});

console.log('👀 Watching for server changes...');
console.log('📦 Client watching handled by esbuild --watch');
console.log('🌐 Server will be available at http://localhost:3000');
console.log('Press Ctrl+C to stop');