const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Datenbank
let storage = {};
let onlineUsers = new Set();

// WebSocket Verbindungen für Live-Updates
wss.on('connection', (ws) => {
  console.log('Neuer Client verbunden');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'user_online') {
        onlineUsers.add(data.username);
        broadcast({ type: 'users_update', users: Array.from(onlineUsers) });
      }
      
      if (data.type === 'user_offline') {
        onlineUsers.delete(data.username);
        broadcast({ type: 'users_update', users: Array.from(onlineUsers) });
      }
      
      if (data.type === 'new_message') {
        broadcast(data);
      }
      
      if (data.type === 'typing') {
        broadcast(data);
      }
    } catch (e) {
      console.error('WebSocket Fehler:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('Client getrennt');
  });
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Storage API Endpoints
app.get('/api/storage/:key', (req, res) => {
  const { key } = req.params;
  const shared = req.query.shared === 'true';
  const storageKey = shared ? `shared_${key}` : `${req.ip}_${key}`;
  
  if (storage[storageKey]) {
    res.json({ key, value: storage[storageKey], shared });
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

app.post('/api/storage/:key', (req, res) => {
  const { key } = req.params;
  const { value, shared } = req.body;
  const storageKey = shared ? `shared_${key}` : `${req.ip}_${key}`;
  
  storage[storageKey] = value;
  res.json({ key, value, shared: !!shared });
});

app.delete('/api/storage/:key', (req, res) => {
  const { key } = req.params;
  const shared = req.query.shared === 'true';
  const storageKey = shared ? `shared_${key}` : `${req.ip}_${key}`;
  
  if (storage[storageKey]) {
    delete storage[storageKey];
    res.json({ key, deleted: true, shared });
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

app.get('/api/storage', (req, res) => {
  const prefix = req.query.prefix || '';
  const shared = req.query.shared === 'true';
  const userPrefix = shared ? 'shared_' : `${req.ip}_`;
  
  const keys = Object.keys(storage)
    .filter(k => k.startsWith(userPrefix + prefix))
    .map(k => k.replace(userPrefix, ''));
  
  res.json({ keys, prefix: prefix || undefined, shared });
});

// Benutzer suchen
app.get('/api/users/search', (req, res) => {
  const query = req.query.q || '';
  try {
    const usersResult = storage['shared_users'];
    if (!usersResult) {
      return res.json([]);
    }
    
    const users = JSON.parse(usersResult);
    const usernames = Object.keys(users).filter(u => 
      u.toLowerCase().includes(query.toLowerCase())
    );
    res.json(usernames);
  } catch (e) {
    res.json([]);
  }
});

// Online Benutzer abrufen
app.get('/api/users/online', (req, res) => {
  res.json(Array.from(onlineUsers));
});

// Hauptseite ausliefern
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('index.html not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
  console.log(`📁 Public folder: ${path.join(__dirname, 'public')}`);
});
