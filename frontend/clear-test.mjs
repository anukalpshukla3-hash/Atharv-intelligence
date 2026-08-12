import { io } from 'socket.io-client';

const SOCKET = 'https://participating-hydraulic-values-optional.trycloudflare.com';
const visitorId = 'cleartest-' + Date.now().toString(36);
let conversationId = null;
let adminCleared = false;
let visitorCleared = false;

const vis = io(SOCKET, {
  auth: { role: 'visitor', visitorId },
  transports: ['websocket'],
  reconnectionAttempts: 0,
});
const adm = io(SOCKET, {
  auth: { role: 'admin', token: process.env.TOKEN },
  transports: ['websocket'],
  reconnectionAttempts: 0,
});

vis.on('connect', () => console.log('1) visitor connected'));
vis.on('user:ack', (d) => console.log('   message persisted:', d.message.id.slice(0, 8)));
vis.on('user:cleared', () => {
  visitorCleared = true;
  console.log('3) visitor received user:cleared');
  check();
});
vis.on('user:error', (d) => { console.log('   visitor err:', d.message); process.exit(1); });

adm.on('connect', () => console.log('   admin connected'));
adm.on('admin:newMessage', (d) => {
  conversationId = d.conversation.id;
  console.log('2) admin got message; clearing conversation', conversationId.slice(0, 8));
  adm.emit('admin:clear', { conversationId });
});
adm.on('admin:conversationCleared', ({ conversationId: id }) => {
  if (id === conversationId) {
    adminCleared = true;
    console.log('4) admin received admin:conversationCleared');
    check();
  }
});

function check() {
  if (adminCleared && visitorCleared) {
    console.log('5) BOTH SIDES NOTIFIED');
    process.exit(0);
  }
}

setTimeout(() => {
  vis.emit('user:send', { kind: 'text', content: 'clear me' });
}, 2000);

setTimeout(() => {
  console.log('TIMEOUT — adminCleared:', adminCleared, 'visitorCleared:', visitorCleared);
  process.exit(1);
}, 15000);
