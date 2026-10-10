import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config.js';
import { registerSocketHandlers } from './sockets.js';
import { registerRoutes } from './routes.js';

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.stack);
  process.exit(1);
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Defensive response headers for the public API and health endpoint.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  if (_req.secure || _req.header('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors({ origin: config.corsOrigins, credentials: true, maxAge: 600 }));
app.use(express.json({ limit: '2mb' }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.corsOrigins, credentials: true },
  maxHttpBufferSize: 1e6,
});

registerRoutes(app);
registerSocketHandlers(io);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Atharv Intelligence backend listening on 0.0.0.0:${config.port}`);
});
