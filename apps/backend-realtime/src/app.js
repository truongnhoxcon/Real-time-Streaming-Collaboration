const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./config/db');
const { connectAll, isConnected } = require('./config/redis');
const socketAuthMiddleware = require('./middlewares/socketAuth.middleware');
const { registerChatHandler, registerRedisMessageSubscriber } = require('./handlers/chat.handler');
const { registerPresenceHandler, registerRedisPresenceSubscriber } = require('./handlers/presence.handler');
const { registerWebRTCHandler } = require('./signaling/webrtc.handler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io Server
// ALB routes "/ws/*" to this backend, so we configure Socket.io path to "/ws"
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/ws',
  transports: ['websocket', 'polling'],
});

// Attach JWT Handshake middleware for authentication
io.use(socketAuthMiddleware);

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`Socket connection initiated. ID: ${socket.id}`);

  // Register events handlers
  registerChatHandler(io, socket);
  registerPresenceHandler(io, socket);
  registerWebRTCHandler(io, socket);
});

// ALB liveness probe – instant 200, no dependency checks.
// The realtime target group health_check.path is "/health" on port 4000.
// Querying DB or Redis here would cause the task to be marked unhealthy during
// any backing-service blip and trigger unnecessary container replacements.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Alias under the Socket.io path prefix for completeness.
app.get('/ws/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

/**
 * Connect to backing storage and start the HTTP server.
 *
 * IMPORTANT: server.listen() is called FIRST, before Redis connects, so the
 * ALB health check on /health returns 200 immediately after the container
 * starts. This prevents the task from being killed during the Redis connect
 * phase and avoids the "ServicesStable Max attempts exceeded" failure.
 *
 * @param {number} port
 */
async function startServer(port) {
  // 1. Bind HTTP server immediately so /health is reachable from the moment
  //    the container starts – ALB needs this to mark the target healthy.
  await new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => {
      console.log(`Real-time WebSocket server is listening on 0.0.0.0:${port} (Path: /ws)`);
      resolve();
    });
  });

  try {
    // 2. Connect Redis clients (after the port is open).
    console.log('Connecting to Redis...');
    await connectAll();

    // 3. Register Redis Pub/Sub event sync subscribers.
    registerRedisMessageSubscriber(io);
    registerRedisPresenceSubscriber(io);

    console.log('Redis connected – Pub/Sub subscribers registered.');
  } catch (err) {
    // Redis failure must NOT crash the process: the HTTP server is already
    // listening and the ALB target would go Draining if we exit here.
    // Log the error and let the redis reconnectStrategy handle recovery.
    console.error('Redis connection failed during startup – will retry automatically:', err.message);
  }

  return server;
}

module.exports = {
  app,
  server,
  io,
  startServer,
};
