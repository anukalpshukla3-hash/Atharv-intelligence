import { io } from 'socket.io-client';

const SOCKET = process.env.SOCKET_URL;
const FRONT = process.env.FRONT_URL ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!SOCKET || !EMAIL || !PASSWORD) {
  console.error('Set SOCKET_URL, ADMIN_EMAIL, ADMIN_PASSWORD (FRONT_URL optional)');
  process.exit(1);
}

const signIn = await fetch(SOCKET + '/api/admin/sign-in', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Origin: FRONT,
  },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
console.log('1) sign-in status:', signIn.status);
const auth = await signIn.json();
if (!auth.token) {
  console.log('   FAIL:', auth.error);
  process.exit(1);
}
console.log('   token issued:', auth.token.slice(0, 20) + '...', '| operator:', auth.user.name);

const visitorId = 'test-visitor-' + Date.now().toString(36);
const vis = io(SOCKET, { auth: { role: 'visitor', visitorId }, transports: ['websocket'] });
const adm = io(SOCKET, { auth: { role: 'admin', token: auth.token }, transports: ['websocket'] });

let replied = false;

vis.on('connect', () => console.log('2) visitor socket connected'));
vis.on('user:ack', (d) => console.log('3) visitor message persisted:', d.message.id));
vis.on('user:message', (d) => {
  console.log('5) visitor received reply:', JSON.stringify(d.message.content));
  replied = true;
  process.exit(0);
});
vis.on('user:error', (d) => { console.log('   visitor err:', d.message); process.exit(1); });

adm.on('connect', () => console.log('   admin socket connected'));
adm.on('admin:newMessage', (d) => {
  console.log('4) admin got queue item:', d.conversation.visitor_label, '| kind:', d.message.kind);
  adm.emit('admin:reply', {
    conversationId: d.conversation.id,
    kind: 'text',
    content: 'Greetings from the Command Center. This is Atharv. :)',
  });
  console.log('   admin sent reply');
});

setTimeout(() => {
  if (replied) return;
  console.log('   sending test message...');
  vis.emit('user:send', { kind: 'text', content: 'Integration test — is anyone home?' });
}, 2500);

setTimeout(() => { console.log('TIMEOUT — something failed'); process.exit(1); }, 15000);
