// server.mjs
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sendEvalHandler from './api/send-eval.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// JSON jusqu'à 25 Mo (PDF encodé base64)
app.use(express.json({ limit: '25mb' }));

// Servir les fichiers statiques (index.html, script.js, etc.)
app.use(express.static(__dirname));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// API pour envoyer l'évaluation par mail
app.post('/api/send-eval', (req, res) => sendEvalHandler(req, res));

// Logs au démarrage
console.log('ENV:', {
  MAIL_PROVIDER: process.env.MAIL_PROVIDER,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_FROM: process.env.SMTP_FROM
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé: http://localhost:${PORT}`);
});
