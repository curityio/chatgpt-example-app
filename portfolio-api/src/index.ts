import express from 'express';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';

const portfolio = [
    {
        "id": "MSFT",
        "name": "Microsoft Corporation",
        currentPrice: 486.74,
        quantity: 23,
    },
    {
        "id": "NVDA",
        "name": "NVIDIA Corp",
        currentPrice: 183.65,
        quantity: 56,
    },
    {
        "id": "AAPL",
        "name": "Apple Inc",
        currentPrice: 282.56,
        quantity: 12
    },
];

const app = express();
app.use(morgan('combined'));
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

    console.log(`Received ${req.method} request to ${req.path} with token ${token}. Decoded token: `, decoded);

    if (!decoded || decoded.sub !== 'john.doe@demo.example') {
        console.log('Invalid subject in token: ' + decoded.sub);
      return res.status(403).json({ error: 'Invalid token or unauthorized user' });
    }

    // Apply authorization logic. Here we simply require concrete scopes for HTTP method. In a real scenario this could delegate authorization to a policy engine

      if (req.method === 'GET') {
            if (!decoded.scope || !decoded.scope.includes('portfolio')) {
                console.log('Token missing scope `portfolio`: ', decoded.scope);
                return res.status(403).json({ error: 'Insufficient scope. The token needs scope `portfolio`.'})
            }
      } else if (req.method === 'PUT') {
          if (!decoded.scope || !decoded.scope.includes('transactions')) {
              console.log('Token missing scope `transactions`: ', decoded.scope);
              return res.status(403).json({ error: 'Insufficient scope. The token needs scope `transactions`.'})
          }
      }

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

app.get('/api/portfolio', (req, res) => {
  res.json(portfolio);
});

app.put('/api/portfolio/:id', authenticateToken, (req, res) => {
  const stockIndex = portfolio.findIndex(t => t.id === req.params.id);
  if (stockIndex !== -1) {
    const delta = req.body.delta;
    const newQuantity = portfolio[stockIndex].quantity + delta;
    portfolio[stockIndex].quantity = newQuantity;
    res.json(portfolio[stockIndex]);
  } else {
    res.status(404).json({ error: 'Stock not found' });
  }
});

const port = 8080;
app.listen(port, () => {
  console.log(`🚀 API Server listening on http://localhost:${port} with hot reloading!`);
});
