import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKERS_FILE = path.join(__dirname, '..', 'workers-extra.json');

const ADMIN_USERS = {
  'c.portella@lixon.net': 'Portella2024!',
  'b.potiaux@lixon.net':  'Potiaux2024!'
};

function readWorkers() {
  try {
    if (fs.existsSync(WORKERS_FILE)) {
      return JSON.parse(fs.readFileSync(WORKERS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function checkAuth(username, password) {
  return username && password && ADMIN_USERS[username] === password;
}

export function addWorkerHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, worker } = req.body || {};

  if (!checkAuth(username, password)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (!worker || !worker.matricule || !worker.nom || !worker.prenom || !worker.fonction) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (matricule, nom, prenom, fonction)' });
  }

  const workers = readWorkers();

  const exists = workers.some(w => String(w.matricule) === String(worker.matricule));
  if (exists) {
    return res.status(409).json({ error: `Le matricule ${worker.matricule} existe déjà.` });
  }

  workers.push({
    matricule: String(worker.matricule).trim(),
    nom:       String(worker.nom).trim().toUpperCase(),
    prenom:    String(worker.prenom).trim().toUpperCase(),
    naissance: worker.naissance || '',
    entree:    worker.entree    || '',
    qualif:    String(worker.qualif || '').trim(),
    fonction:  String(worker.fonction).trim()
  });

  fs.writeFileSync(WORKERS_FILE, JSON.stringify(workers, null, 2), 'utf-8');
  res.status(200).json({ success: true, total: workers.length });
}

export function deleteWorkerHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password, matricule } = req.body || {};

  if (!checkAuth(username, password)) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (!matricule) {
    return res.status(400).json({ error: 'Matricule manquant' });
  }

  const workers = readWorkers();
  const filtered = workers.filter(w => String(w.matricule) !== String(matricule));

  if (filtered.length === workers.length) {
    return res.status(404).json({ error: `Matricule ${matricule} introuvable.` });
  }

  fs.writeFileSync(WORKERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  res.status(200).json({ success: true, total: filtered.length });
}
