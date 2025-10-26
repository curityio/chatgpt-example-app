import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Message } from './messages';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/message', (req, res) => {
  res.json({ 
    message: 'Hello from the TypeScript server!',
    timestamp: new Date().toISOString()
  });
});

// Serve the main application for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.post('/api/message', (req, res) => {
  const userMessage: Message = req.body;
  const reply: Message = { 
    role: 'assistant',
    content: `ECHO: ${userMessage.content}`,
    timestamp: new Date().toISOString() 
    };
  res.json(reply);
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📁 Serving static files from public directory`);
  console.log(`🔧 Development mode: ${process.env.NODE_ENV !== 'production'}`);
});