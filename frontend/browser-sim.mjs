import { io } from 'socket.io-client';

const SOCKET = 'https://participating-hydraulic-values-optional.trycloudflare.com';
const ORIGIN = 'https://mary-particle-act-skirts.trycloudflare.com';

const vis = io(SOCKET, {
  auth: { role: 'visitor', visitorId: 'browzr-sim-12345678' },
  transports: ['polling', 'websocket'],
  reconnectionAttempts: 0,
  extraHeaders: { Origin: ORIGIN },
});

vis.on('connect', () => {
  console.log('VISITOR CONNECTED (browser-sim, polling+ws, Origin sent)');
  vis.emit('user:send', { kind: 'text', content: 'browser simulation message' });
});
vis.on('user:ack', (d) => {
  console.log('ACK persisted:', d.message.id);
  vis.disconnect();
  process.exit(0);
});
vis.on('connect_error', (e) => {
  console.log('CONNECT_ERROR:', e.message, e.context?.status ?? '');
  process.exit(1);
});
setTimeout(() => {
  console.log('TIMEOUT');
  process.exit(1);
}, 15000);
