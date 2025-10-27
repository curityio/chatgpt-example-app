import express from 'express';
import cors from 'cors';
import config from '../config.json';

const todos = [
  { id: 1, task: 'Buy milk', completed: false },
  { id: 2, task: 'Walk the dog', completed: true },
  { id: 3, task: 'Do laundry', completed: false },
];

const app = express();
app.use(cors(config.cors));
app.use(express.json());

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

const port = 8080;
app.listen(port, () => {
  console.log(`🚀 API Server listening on http://localhost:${port} with hot reloading!`);
});
