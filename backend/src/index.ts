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
app.use(cors({ origin: config.corsOrigins, credentials: true }));
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
