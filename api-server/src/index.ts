import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import config from '../config.json';

const todos = [
  { id: 1, task: 'Buy milk', completed: false },
  { id: 2, task: 'Walk the dog', completed: true },
  { id: 3, task: 'Do laundry', completed: false },
];

const app = express();
app.use(morgan('combined'));
app.use(cors(config.cors));
app.use(express.json());

// JWT middleware for authorization, should actually validate the JWT.
// Here we just decode it and check for a specific user for demonstration purposes.
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'You must obtain authorization.' });
  }

  try {
    const decoded = jwt.decode(token) as any;
    
    if (!decoded || decoded.sub !== 'johndoe') {
      return res.status(403).json({ error: 'Invalid token or unauthorized user' });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

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

app.put('/api/todos/:id', authenticateToken, (req, res) => {
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
