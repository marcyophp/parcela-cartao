import express from 'express';
import path from 'path';
import fs from 'fs';
import {getAllConfig, setConfigBulk, clearAllConfig} from './db';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = '3692';

app.use(express.json());

// Serve built frontend
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Auth endpoint
app.post('/api/auth', (req, res) => {
  const {password} = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ok: true});
  }
  return res.status(401).json({ok: false, error: 'Senha incorreta'});
});

// Get all config
app.get('/api/config', (_req, res) => {
  const config = getAllConfig();
  res.json(config);
});

// Save config (authenticated)
app.post('/api/config', (req, res) => {
  const {password, config} = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ok: false, error: 'Senha incorreta'});
  }
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ok: false, error: 'Config inválida'});
  }
  setConfigBulk(config as Record<string, string>);
  return res.json({ok: true});
});

// Reset config
app.post('/api/config/reset', (req, res) => {
  const {password} = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ok: false, error: 'Senha incorreta'});
  }
  clearAllConfig();
  return res.json({ok: true});
});

// SPA fallback
app.get('*', (_req, res) => {
  const index = path.resolve(distPath, 'index.html');
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(404).json({error: 'Frontend não compilado. Execute npm run build primeiro.'});
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
