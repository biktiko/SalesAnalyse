require('dotenv').config();
const express = require('express');
const cors = require('cors');
const net = require('net');
const { Client } = require('pg');
const { Client: SSHClient } = require('ssh2');

const app = express();
app.use(cors());
app.use(express.json());

// Healthy endpoint for Cron-job or Render monitoring
app.get('/', (req, res) => res.send('Backend is LIVE and Healthy'));

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '51.158.61.4',
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASS,
  readyTimeout: 20000 
};

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'QRBonus' 
};

app.post('/api/query', async (req, res) => {
  const { queryText } = req.body;
  if (!queryText) return res.status(400).json({ error: 'Missing queryText' });

  const ssh = new SSHClient();
  let server = null;
  const tunnelPort = 5433;

  const cleanup = () => {
    try {
      if (server) {
        server.close();
        server = null;
      }
      ssh.end();
    } catch (e) {}
  };

  ssh.on('ready', () => {
    server = net.createServer((socket) => {
      ssh.forwardOut('127.0.0.1', socket.remotePort, DB_CONFIG.host, DB_CONFIG.port, (err, stream) => {
        if (err) {
          socket.end();
          return;
        }
        socket.pipe(stream);
        stream.pipe(socket);
      });
    });

    server.listen(tunnelPort, '127.0.0.1', async () => {
      const pgClient = new Client({
        host: '127.0.0.1',
        port: tunnelPort,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database,
        connectionTimeoutMillis: 10000
      });

      pgClient.on('error', (err) => {
        console.error('PG Client Error during op:', err.message);
        cleanup();
      });

      try {
        await pgClient.connect();
        const result = await pgClient.query(queryText);
        
        res.json({
          success: true,
          rowCount: result.rowCount,
          rows: result.rows,
          fields: result.fields.map(f => f.name)
        });

        await pgClient.end();
        cleanup();
      } catch (dbErr) {
        cleanup();
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'DB_ERROR', 
            message: dbErr.message,
            hint: 'Check if DB credentials on Render are correct.' 
          });
        }
      }
    });

    server.on('error', (err) => {
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'TUNNEL_ERROR', message: err.message });
      }
    });

  }).on('error', (err) => {
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'SSH_AUTH_ERROR', 
        message: err.message,
        hint: 'Verify SSH_USER and SSH_PASS environment variables on Render.' 
      });
    }
  }).connect(SSH_CONFIG);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server live on port ${PORT}`);
});

// Explicit keep-alive for Windows environment
setInterval(() => {}, 100000);
