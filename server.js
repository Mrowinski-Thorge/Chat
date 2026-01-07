const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Datenbank
let storage = {};

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

// Route für die Hauptseite
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log('Trying to serve:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('index.html not found. Current directory: ' + __dirname);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log('Current directory:', __dirname);
  console.log('Public folder exists:', fs.existsSync(path.join(__dirname, 'public')));
});
