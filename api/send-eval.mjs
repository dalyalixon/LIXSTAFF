// api/send-eval.mjs
import nodemailer from "nodemailer";
import { Buffer } from "node:buffer";

// Destinataires FIXES
const FIXED_RECIPIENTS = [
  "c.portella@lixon.net",
  "b.potiaux@lixon.net",
  // "d.hamache@lixon.net",
];

export default async function handler(req, res) {
  if ((req.method || "POST") !== "POST") {
    res.statusCode = 405;
    return res.end("Method Not Allowed");
  }

  try {
    // Express.json a déjà parsé le corps (sinon fallback)
    const body =
      req.body && Object.keys(req.body).length ? req.body : await getRawJson(req);

    const { subject, filename, pdfBase64, data } = body || {};

    if (!pdfBase64) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: "pdfBase64 manquant" }));
    }

    const subj = subject || "Évaluation";
    const file = filename || "evaluation.pdf";
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // ✅ HTML MAIL : commentaires visibles EN ENTIER (wrap + retours à la ligne)
    // Note: Outlook peut parfois “couper” visuellement si le conteneur n’a pas de wrap.
    // Ici on force: white-space:pre-wrap + word-break + overflow-wrap
    const mailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
        <h2 style="margin:0 0 12px">Évaluation du personnel</h2>

        <p>
          <strong>Employé :</strong> ${escapeHtml(data?.nom || "")}<br>
          <strong>Métier :</strong> ${escapeHtml(data?.metier || "")}<br>
          <strong>Date de naissance :</strong> ${escapeHtml(data?.date_naissance || "")}<br>
          <strong>Qualification :</strong> ${escapeHtml(data?.qualification || "")}<br>
          <strong>Date d’entrée :</strong> ${escapeHtml(data?.date_entree || "")}<br>
          <strong>Date évaluation :</strong> ${escapeHtml(data?.dateEval || "")}<br>
          <strong>Auteur :</strong> ${escapeHtml(data?.auteur || "")}<br>
          <strong>Évaluateur :</strong> ${escapeHtml(data?.approbateur || "")}<br>
          <strong>Évalué :</strong> ${escapeHtml(data?.evalue || "")}
        </p>

        <h3 style="margin:16px 0 8px">Critères</h3>
        <table style="border-collapse:collapse;width:100%;table-layout:fixed">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd;width:70%">Critère</th>
              <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd;width:30%">Appréciation</th>
            </tr>
          </thead>
          <tbody>
            ${(Array.isArray(data?.evaluation) ? data.evaluation : [])
              .map(
                (r) => `
                <tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;white-space:normal;word-break:break-word;overflow-wrap:anywhere">
                    ${escapeHtml(r?.critere || "")}
                  </td>
                  <td style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;white-space:normal;word-break:break-word;overflow-wrap:anywhere">
                    <b>${escapeHtml(r?.note || "")}</b>
                  </td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>

        <h3 style="margin:16px 0 8px">Commentaire général</h3>
        <!-- ✅ commentaires EN ENTIER -->
        <div style="
          border:1px solid #eee;
          padding:10px 12px;
          background:#fafafa;
          white-space:pre-wrap;
          word-break:break-word;
          overflow-wrap:anywhere;
          max-width:100%;
        ">${escapeHtml(data?.commentaire || "")}</div>

        <h3 style="margin:16px 0 8px">Compléments</h3>

        <p style="margin:8px 0 4px"><b>Fonctions :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.fonctions || "")}
        </div>

        <p style="margin:8px 0 4px"><b>Aspirations :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.aspirations || "")}
        </div>

        <p style="margin:8px 0 4px"><b>Formations :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.formations || "")}
        </div>

        <p style="margin:8px 0 4px"><b>Objectifs :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.objectifs || "")}
        </div>

        <p style="margin:8px 0 4px"><b>Remarques :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.remarques || "")}
        </div>

        <p style="margin:8px 0 4px"><b>Accidents / incidents :</b></p>
        <div style="border:1px solid #eee;padding:8px;background:#fff;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere">
          ${escapeHtml(data?.accidents || "")}
        </div>

        <hr style="margin:16px 0">
        <p>📎 Le PDF de l’évaluation est joint à ce message.</p>
      </div>
    `;

    // ✅ Version texte (toujours complète)
    const text = [
      "Évaluation du personnel",
      `Employé : ${data?.nom || ""}`,
      `Métier : ${data?.metier || ""}`,
      `Date de naissance : ${data?.date_naissance || ""}`,
      `Qualification : ${data?.qualification || ""}`,
      `Date d'entrée : ${data?.date_entree || ""}`,
      `Date évaluation : ${data?.dateEval || ""}`,
      `Auteur : ${data?.auteur || ""}`,
      `Évaluateur : ${data?.approbateur || ""}`,
      `Évalué : ${data?.evalue || ""}`,
      "",
      "Critères :",
      ...(Array.isArray(data?.evaluation)
        ? data.evaluation.map((r) => `- ${r?.critere || ""} : ${r?.note || ""}`)
        : []),
      "",
      "Commentaire :",
      data?.commentaire || "",
      "",
      "Compléments :",
      `Fonctions : ${data?.fonctions || ""}`,
      `Aspirations : ${data?.aspirations || ""}`,
      `Formations : ${data?.formations || ""}`,
      `Objectifs : ${data?.objectifs || ""}`,
      `Remarques : ${data?.remarques || ""}`,
      `Accidents : ${data?.accidents || ""}`,
    ].join("\n");

    console.log("📩 Incoming /api/send-eval", {
      provider: "smtp",
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: FIXED_RECIPIENTS,
      subject: subj,
      filename: file,
      pdfLen: pdfBuffer.length,
    });

    // ===== ENVOI SMTP (Nodemailer + Office 365) =====
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.office365.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER, // ex: itsupport@lixon.net
        pass: process.env.SMTP_PASS, // mot de passe ou mot de passe d’application
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: FIXED_RECIPIENTS.join(","),
      subject: subj,
      html: mailHtml,
      text,
      attachments: [
        {
          filename: file,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ SMTP OK", info.messageId);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, id: info.messageId }));
  } catch (err) {
    console.error("❌ SMTP error:", err);
    res.statusCode = 500;
    return res.end(
      JSON.stringify({ error: "SMTPError", message: String(err?.message || err) })
    );
  }
}

/* Helpers */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

// Fallback si jamais express.json n'a pas parsé (rare)
function getRawJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on?.("data", (chunk) => {
      data += chunk;
      if (data.length > 30 * 1024 * 1024) req.destroy?.();
    });
    req.on?.("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on?.("error", reject);
  });
}
