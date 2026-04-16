'use strict';
// server/ws.js — WebSocket server with channel-based subscription routing
const WebSocket = require('ws');

function createWss(httpServer) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

  // Share with live_chat route for broadcasts
  try {
    const liveChatRoute = require('./routes/live_chat');
    if (liveChatRoute.setWss) liveChatRoute.setWss(wss);
  } catch(e) { console.warn('[ws] Could not connect live_chat broadcast:', e.message); }

  wss.on('connection', (ws) => {
    ws.subscriptions = new Set();
    ws.isAlive = true;

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      switch (msg.type) {
        case 'subscribe':
          if (msg.channel) ws.subscriptions.add(msg.channel);
          ws.send(JSON.stringify({ type:'subscribed', channel:msg.channel }));
          break;
        case 'unsubscribe':
          if (msg.channel) ws.subscriptions.delete(msg.channel);
          break;
        case 'ping':
          ws.isAlive = true;
          ws.send(JSON.stringify({ type:'pong' }));
          break;
        default: break;
      }
    });

    ws.on('close', () => ws.subscriptions.clear());
    ws.on('error', () => ws.subscriptions.clear());
    ws.send(JSON.stringify({ type:'connected', ts:Date.now() }));
  });

  // Heartbeat — prune dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.subscriptions.clear(); return ws.terminate(); }
      ws.isAlive = false;
    });
  }, 30_000);

  wss.on('close', () => clearInterval(interval));
  console.log('WebSocket server ready on /ws');
  return wss;
}

module.exports = { createWss };
