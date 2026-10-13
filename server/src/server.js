const express = require('express');
const cors = require('cors');
const path = require('path');
const sseService = require('./services/sseService');

// Routers
const authRouter = require('./routes/auth');
const zonesRouter = require('./routes/zones');
const rateCardsRouter = require('./routes/rateCards');
const agentsRouter = require('./routes/agents');
const ordersRouter = require('./routes/orders');
const notificationsRouter = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS for Vite frontend (typically localhost:5173)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id']
}));

app.use(express.json());

// Server-Sent Events (SSE) Stream for real-time frontend reactivity
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseService.addClient(res);

  // Send initial handshake
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ connected: true, timestamp: Date.now() })}\n\n`);
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api', zonesRouter);
app.use('/api', rateCardsRouter);
app.use('/api', agentsRouter);
app.use('/api', ordersRouter);
app.use('/api', notificationsRouter);

// Health & Metrics endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Last-Mile Delivery Tracker API'
  });
});

// Serve frontend in production build if present
const clientDist = path.resolve(__dirname, '../../client/dist');
const fs = require('fs');
app.use(express.static(clientDist));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Last-Mile Delivery Backend Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
