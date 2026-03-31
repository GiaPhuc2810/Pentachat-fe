import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
let nextId = 1;

wss.on('connection', (ws) => {
  ws.id = nextId++;
  ws.send(JSON.stringify({ type: 'id', id: ws.id }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const payload = JSON.stringify({ ...msg, from: ws.id });
    for (const client of wss.clients) {
      if (client !== ws && client.readyState === 1) {
        client.send(payload);
      }
    }
  });
});

console.log('WebSocket signaling on ws://localhost:8080');