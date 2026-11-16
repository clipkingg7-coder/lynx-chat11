// LYNX CHAT — Chat To Strangers
// Backend: Express serves the site + Socket.IO does matchmaking + WebRTC signaling.
// Deploy this whole folder to Render (free). One deploy = everything works.
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const PORT = process.env.PORT || 3000;

// Serve the frontend (put index.html in /public)
app.use(express.static(path.join(__dirname, 'public')));

// ---------- state ----------
// waiting queue: [{ socketId, interests: Set, since: ms }]
let waiting = [];
// pairs: socketId -> { partner: socketId }
const pairs = new Map();

const MAX_MSG = 2000;

function broadcastOnline() {
  io.emit('online', io.engine.clientsCount);
}

function leaveCurrent(socket, notifyPartner) {
  const p = pairs.get(socket.id);
  if (!p) return;
  if (notifyPartner) {
    io.to(p.partner).emit('partner:left');
    pairs.delete(p.partner);
  }
  pairs.delete(socket.id);
}

function removeFromWaiting(socketId) {
  waiting = waiting.filter(w => w.socketId !== socketId);
}

// Match a joining socket. Prefers shared interests, else longest-waiting.
function tryMatch(socket) {
  const myInts = new Set((socket.data.interests || []).map(s => String(s).toLowerCase().trim()).filter(Boolean));

  let partner = null;
  for (const w of waiting) {
    if (w.interests.size && [...w.interests].some(i => myInts.has(i))) { partner = w; break; }
  }
  if (!partner && waiting.length > 0) partner = waiting[0];

  if (!partner) {
    waiting.push({ socketId: socket.id, interests: myInts, since: Date.now() });
    io.to(socket.id).emit('searching');
    return;
  }

  removeFromWaiting(partner.socketId);
  const partnerSocket = io.sockets.sockets.get(partner.socketId);
  if (!partnerSocket || !partnerSocket.connected) return tryMatch(socket);

  pairs.set(socket.id, { partner: partner.socketId });
  pairs.set(partner.socketId, { partner: socket.id });

  // The older socket initiates the WebRTC offer
  io.to(partner.socketId).emit('matched', { initiator: true });
  io.to(socket.id).emit('matched', { initiator: false });
}

io.on('connection', (socket) => {
  broadcastOnline();

  socket.on('join', (payload) => {
    const interests = Array.isArray(payload && payload.interests) ? payload.interests.slice(0, 10) : [];
    socket.data.interests = interests;
    leaveCurrent(socket, true);
    removeFromWaiting(socket.id);
    tryMatch(socket);
  });

  socket.on('chat:message', (text) => {
    const p = pairs.get(socket.id);
    if (!p) return;
    const clean = String(text == null ? '' : text).slice(0, MAX_MSG);
    if (!clean.trim()) return;
    io.to(p.partner).emit('chat:message', clean);
  });

  socket.on('typing', () => {
    const p = pairs.get(socket.id);
    if (p) io.to(p.partner).emit('typing');
  });
  socket.on('stop:typing', () => {
    const p = pairs.get(socket.id);
    if (p) io.to(p.partner).emit('stop:typing');
  });

  // WebRTC signaling relay (video + voice)
  socket.on('webrtc:offer', (offer) => {
    const p = pairs.get(socket.id);
    if (p) io.to(p.partner).emit('webrtc:offer', offer);
  });
  socket.on('webrtc:answer', (answer) => {
    const p = pairs.get(socket.id);
    if (p) io.to(p.partner).emit('webrtc:answer', answer);
  });
  socket.on('webrtc:ice', (candidate) => {
    const p = pairs.get(socket.id);
    if (p) io.to(p.partner).emit('webrtc:ice', candidate);
  });

  socket.on('leave', () => {
    leaveCurrent(socket, true);
    removeFromWaiting(socket.id);
  });

  socket.on('disconnect', () => {
    leaveCurrent(socket, true);
    removeFromWaiting(socket.id);
    broadcastOnline();
  });
});

// Clean stale waiting entries every 30s
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  waiting = waiting.filter(w => {
    if (w.since < cutoff) { io.to(w.socketId).emit('search:timeout'); return false; }
    return true;
  });
}, 30000);

server.listen(PORT, () => {
  console.log('LYNX CHAT live on http://localhost:' + PORT);
});
