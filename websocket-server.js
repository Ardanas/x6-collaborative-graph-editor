import { WebSocketServer } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 1234;

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('okay');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, {
    gc: true,
    docName: 'x6-demo-room'
  });
});

server.listen(port, host, () => {
  console.log(`Signaling server running on ${host}:${port}`);
});

// 可选：在进程退出时清理资源
process.on('SIGINT', () => {
  wss.close();
  server.close();
  process.exit(0);
});