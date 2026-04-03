require('dotenv').config();
const express = require('express');
const cors = require('cors');
const net = require('net');
const { Client } = require('pg');
const { Client: SSHClient } = require('ssh2');

const app = express();
app.use(cors());
app.use(express.json());

// Root endpoint for simple Health Checks (Cron-job.org / Render.com)
app.get('/', (req, res) => res.send('OK'));

const SSH_CONFIG = {
  host: process.env.SSH_HOST || '51.158.61.4',
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASS
};

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'QRBonus' 
};

// Generic query executor for development
app.post('/api/query', async (req, res) => {
  const { queryText } = req.body;
  
  if (!queryText) {
    return res.status(400).json({ error: 'Query text is required' });
  }

  const ssh = new SSHClient();
  let server = null;
  const localPort = Math.floor(Math.random() * (60000 - 10000 + 1)) + 10000; 

  // Cleanup helper function
  const cleanup = () => {
    if (server) {
      server.close();
      server = null;
    }
    ssh.end();
  };

  ssh.on('ready', () => {
    server = net.createServer((socket) => {
      ssh.forwardOut('127.0.0.1', 12345, DB_CONFIG.host, DB_CONFIG.port, (err, stream) => {
        if (err) { 
          socket.end(); 
          return; 
        }
        socket.pipe(stream);
        stream.pipe(socket);
      });
    });
    
    server.listen(localPort, '127.0.0.1', async () => {
      const pgClient = new Client({
        host: '127.0.0.1',
        port: localPort,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
        database: DB_CONFIG.database
      });
      
      // CRITICAL: Handle unexpected client errors to prevent process crash
      pgClient.on('error', (err) => {
        console.error('Unexpected PG Client Error:', err.message);
        cleanup();
      });

      try {
        await pgClient.connect();
        const result = await pgClient.query(queryText);
        
        // Return result BEFORE closing to ensure no "Connection terminated" error while sending
        res.json({
          success: true,
          rowCount: result.rowCount,
          rows: result.rows,
          fields: result.fields.map(f => f.name)
        });

        // Graceful termination
        await pgClient.end();
        cleanup();
      } catch (dbErr) {
        console.error('Database Error:', dbErr.message);
        cleanup();
        if (!res.headersSent) {
          res.status(500).json({ error: 'Database Error', message: dbErr.message });
        }
      }
    });

    server.on('error', (err) => {
      console.error('Local Server Error:', err.message);
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Tunnel Server Error', message: err.message });
      }
    });

  }).on('error', (err) => {
    console.error('SSH Client Error:', err.message);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ error: 'SSH Error', message: err.message });
    }
  }).connect(SSH_CONFIG);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server running on port ${PORT}`);
});
