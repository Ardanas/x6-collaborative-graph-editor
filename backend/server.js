import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Database } from '@hocuspocus/extension-database';
import mysql from 'mysql2/promise';

// 创建 MySQL 连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123456',
  database: 'x6-graph',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const tableName = 'graphs'
const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        console.log('Fetching document:', documentName);
        const [rows] = await pool.execute(`SELECT data FROM ${tableName} WHERE name = ?`, [documentName]);
        if (rows.length > 0) {
          console.log('Document found');
          return rows[0].data;
        }
        console.log('Document not found');
        return null;
      },
      store: async ({ documentName, state }) => {
        console.log('Storing document:', documentName);
        await pool.execute(
          `INSERT INTO ${tableName} (name, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?`,
          [documentName, state, state]
        );
        console.log('Document stored');
      },
    }),
  ],
});

server.listen();