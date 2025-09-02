// api/send-eval.mjs
import nodemailer from 'nodemailer';
import { Buffer } from 'node:buffer';

// Destinataires FIXES
const FIXED_RECIPIENTS = [
  'c.portella@lixon.net',
  'b.potiaux@lixon.net',
  'd.hamache@lixon.net'
];

export default async function handler(req, res) {
  if ((req.method || 'POST') !== 'POST') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    // Express.json a déjà parsé le corps
    const body = (req.body && Object.keys(req.body).length) ? req.body : await getRawJson(req);
    const { subject, filename, pdfBase64, data } = body || {};

    if (!pdfBase64) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'pdfBase64 manquant' }));
    }

    const mailHtml = `
      <div style="font-family:Arial,sans-serif">
        <h2>Évaluation du personnel</h2>
        <p><strong>Employé :</strong> ${escapeHtml(data?.nom || '')}</p>
        <p><strong>Métier :</strong> ${escapeHtml(data?.metier || '')}</p>
        <p><strong>Date évaluation :</strong> ${escapeHtml(data?.dateEval || '')}</p>
        <p><strong>Auteur :</strong> ${escapeHtml(data?.auteur || '')}</p>
        <p><strong>Commentaire :</strong><br>${nl2br(escapeHtml(data?.commentaire || ''))}</p>
        <hr><p>Le PDF de l’évaluation est joint à ce message.</p>
      </div>
    `;
    const text = [
      `Évaluation du personnel`,
      `Employé : ${data?.nom || ''}`,
      `Métier : ${data?.metier || ''}`,
      `Date évaluation : ${data?.dateEval || ''}`,
      `Auteur : ${data?.auteur || ''}`,
      ``,
      `Commentaire :`,
      (data?.commentaire || '')
    ].join('\n');

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const file = filename || 'evaluation.pdf';
    const subj = subject || 'Évaluation';

    console.log('📩 Incoming /api/send-eval', {
      provider: 'smtp',
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: FIXED_RECIPIENTS,
      subject: subj,
      filename: file,
      pdfLen: pdfBuffer.length
    });

    // ===== ENVOI SMTP (Nodemailer + Office 365) =====
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER, // ex: itsupport@lixon.net
        pass: process.env.SMTP_PASS  // mot de passe ou mot de passe d’application
      }
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: FIXED_RECIPIENTS.join(','),
      subject: subj,
      html: mailHtml,
      text,
      attachments: [{ filename: file, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    console.log('✅ SMTP OK', info.messageId);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, id: info.messageId }));
  } catch (err) {
    console.error('❌ SMTP error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'SMTPError', message: String(err?.message || err) }));
  }
}

/* Helpers */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function nl2br(s) { return String(s).replace(/\n/g, '<br>'); }

// Fallback si jamais express.json n'a pas parsé (rare)
function getRawJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on?.('data', chunk => {
      data += chunk;
      if (data.length > 30 * 1024 * 1024) req.destroy?.();
    });
    req.on?.('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch (e) { reject(e); }
    });
    req.on?.('error', reject);
  });
}
