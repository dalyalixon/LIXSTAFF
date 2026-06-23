// server.mjs
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sendEvalHandler from './api/send-eval.mjs';
import { addWorkerHandler, deleteWorkerHandler, hideWorkerHandler, restoreWorkerHandler } from './api/add-worker.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '25mb' }));
app.use(express.static(__dirname));

app.get('/health', (req, res) => res.json({ ok: true }));
app.post('/api/send-eval',     (req, res) => sendEvalHandler(req, res));
app.post('/api/add-worker',    (req, res) => addWorkerHandler(req, res));
app.post('/api/delete-worker', (req, res) => deleteWorkerHandler(req, res));
app.post('/api/hide-worker',   (req, res) => hideWorkerHandler(req, res));
app.post('/api/restore-worker',(req, res) => restoreWorkerHandler(req, res));

console.log('ENV:', {
  MAIL_PROVIDER: process.env.MAIL_PROVIDER,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_FROM: process.env.SMTP_FROM
});

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé: http://localhost:${PORT}`);
});
