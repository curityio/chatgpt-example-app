import express from 'express';
import path from 'path';

const todos = [
  { id: 1, task: 'Buy milk', completed: false },
  { id: 2, task: 'Walk the dog', completed: true },
  { id: 3, task: 'Do laundry', completed: false },
];

const app = express();
app.use(express.json());

// Serve static files from the web directory
app.use(express.static(path.join(__dirname, '../../web')));

// Serve index.html for the root path and any unmatched routes (SPA support)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../web/index.html'));
});

app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.get('/api/todos/:id', (req, res) => {
  const todo = todos.find(t => t.id === parseInt(req.params.id));
  if (todo) {
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.put('/api/todos/:id', (req, res) => {
  const todoIndex = todos.findIndex(t => t.id === parseInt(req.params.id));
  if (todoIndex !== -1) {
    todos[todoIndex] = { ...todos[todoIndex], ...req.body };
    res.json(todos[todoIndex]);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

// app.get('*', (req, res, next) => {
//   // Skip API routes
//   if (req.path.startsWith('/mcp')) {
//     return next();
//   }
//   // Serve index.html for client-side routing
//   res.sendFile(path.join(__dirname, '../web/index.html'));
// });

const port = 8080;
app.listen(port, () => {
  console.log(`API Server listening on http://localhost:${port}`);
});
