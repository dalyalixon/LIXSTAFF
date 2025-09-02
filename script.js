/* ================== CONFIG POWER AUTOMATE ================== */
/** ⚠️ Mets ici l'URL “HTTP POST URL” de ton déclencheur Power Automate */
const FLOW_URL = "https://default67f421526f984c3d8a955ed93c38ce.af.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/71d4d5c8f94f41848ddfc7bfb336ae8b/triggers/manual/paths/invoke/?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=nxFtQ01laXfNBx0t3SB-DLvAnvQ3zeBpOG6OsKBgovU";
/** Optionnel: si tu protèges le flow avec un header x-api-key */
const FLOW_API_KEY = "";

/* ================== UI / DONNÉES ================== */
const smileys = ["😊", "🙂", "😐", "🙁", "😡", "❌"];
const labels  = ["Très bon", "Bon", "Moyen", "Insuffisant", "Mauvais", "Non applicable"];

const selectMetier        = document.getElementById("selectMetier");
const questionsList       = document.getElementById("questionsList");
const questionsContainer  = document.getElementById("questionsContainer");
const commentaireSection  = document.getElementById("commentaireSection");
const ficheComplementaire = document.getElementById("ficheComplementaire");
const resultatDiv         = document.getElementById("resultat");
const btnDownload         = document.getElementById("btnDownload");

/* ================== CHARGER LES MÉTIERS ================== */
Object.keys(METIER_QUESTIONS).forEach(metier => {
  const option = document.createElement("option");
  option.value = metier;
  option.textContent = metier;
  selectMetier.appendChild(option);
});

/* ================== AFFICHER LES QUESTIONS ================== */
selectMetier.addEventListener("change", () => {
  const metier = selectMetier.value;
  questionsList.innerHTML = "";

  if (metier && METIER_QUESTIONS[metier]) {
    METIER_QUESTIONS[metier].forEach((question) => {
      const qDiv = document.createElement("div");
      qDiv.className = "question";
      qDiv.dataset.question = question;

      const labelEl = document.createElement("label");
      labelEl.innerText = question;

      const scale = document.createElement("div");
      scale.className = "smiley-scale";

      smileys.forEach((icon, i) => {
        const span = document.createElement("span");
        span.innerText = icon;
        span.title = labels[i];
        span.dataset.value = labels[i];
        span.dataset.icon = icon;
        span.onclick = () => {
          scale.querySelectorAll("span").forEach(s => s.classList.remove("selected"));
          span.classList.add("selected");
        };
        scale.appendChild(span);
      });

      qDiv.appendChild(labelEl);
      qDiv.appendChild(scale);
      questionsList.appendChild(qDiv);
    });

    questionsContainer.style.display = "block";
    commentaireSection.style.display  = "block";
    ficheComplementaire.style.display = "block";
  } else {
    questionsContainer.style.display = "none";
    commentaireSection.style.display  = "none";
    ficheComplementaire.style.display = "none";
  }
});

/* ================== SOUMISSION ================== */
document.getElementById("formEval").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nom           = document.getElementById("nomEmploye").value.trim();
  const metier        = selectMetier.value;
  const dateNaissance = document.getElementById("dateNaissance").value;
  const qualification = document.getElementById("qualification").value.trim();
  const dateEntree    = document.getElementById("dateEntree").value;
  const dateEval      = document.getElementById("dateEvaluation").value;
  const auteur        = document.getElementById("auteurEvaluation").value.trim();
  const commentaire   = document.getElementById("commentaire").value.trim();
  const fonctions     = document.getElementById("fonctions").value.trim();
  const aspirations   = document.getElementById("aspirations").value.trim();
  const formations    = document.getElementById("formations").value.trim();
  const objectifs     = document.getElementById("objectifs").value.trim();
  const remarques     = document.getElementById("remarques").value.trim();
  const accidents     = document.getElementById("accidents").value.trim();
  const luEval        = document.getElementById("luEval").checked;
  const luEvalue      = document.getElementById("luEvalue").checked;

  const champsObligatoires = [
    nom, metier, dateNaissance, qualification, dateEntree, dateEval, auteur,
    commentaire, fonctions, aspirations, formations, objectifs, remarques, accidents
  ];
  if (champsObligatoires.some(c => c === "") || !luEval || !luEvalue) {
    alert("❌ Veuillez remplir tous les champs et cocher les cases de validation.");
    return;
  }

  // Construire l'objet résultat
  const result = {
    nom,
    metier,
    date_naissance: dateNaissance,
    qualification,
    date_entree: dateEntree,
    date_eval: dateEval,
    auteur,
    commentaire,
    fonctions,
    aspirations,
    formations,
    objectifs,
    remarques,
    accidents,
    approbateur: luEval ? "Oui" : "Non",
    evalue:      luEvalue ? "Oui" : "Non",
    evaluation: [] // tableau {critere, emoji, note}
  };

  // Récupérer les notes (smiley + libellé)
  let questionsCompletes = true;
  document.querySelectorAll(".question").forEach(div => {
    const critere  = div.dataset.question;
    const selected = div.querySelector(".selected");
    if (!selected) questionsCompletes = false;
    result.evaluation.push({
      critere,
      emoji: selected ? selected.dataset.icon  : "",
      note:  selected ? selected.dataset.value : "Non noté"
    });
  });
  if (!questionsCompletes) {
    alert("❌ Veuillez répondre à toutes les questions d'évaluation.");
    return;
  }

  // Aperçu écran (facultatif)
  afficherResultat(result);

  try {
    // ====== PDF complet en jsPDF ======
    const fileName = `${sanitizeFileName(nom)}_${sanitizeFileName(metier)}_evaluation.pdf`;
    const doc = buildPdfWithJsPDF(result);       // on récupère l'instance jsPDF
    const base64 = pdfBase64FromDoc(doc);        // base64 propre (binaire → base64)

    // Téléchargement local (facultatif, pour tester)
    if (btnDownload) {
      btnDownload.style.display = "inline-block";
      btnDownload.onclick = () => { doc.save(fileName); };
    }

    // ====== ENVOI AU FLOW (Power Automate) ======
    const headers = { "Content-Type": "application/json" };
    if (FLOW_API_KEY) headers["x-api-key"] = FLOW_API_KEY;

    const payload = {
      subject:  `Évaluation - ${nom} (${metier}) – ${dateEval}`,
      filename: fileName,      // doit finir par .pdf
      pdfBase64: base64,       // côté Flow → base64ToBinary(triggerBody()?['pdfBase64'])
      data: {
        nom, metier, dateEval, auteur, commentaire,
        fonctions, aspirations, formations, objectifs, remarques, accidents,
        approbateur: result.approbateur,
        evalue: result.evalue,
        evaluation: result.evaluation,
        emailBodyHtml: buildEmailHtml(result) // si tu veux t'en servir dans le mail
      }
    };

    const resp = await fetch(FLOW_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const t = await resp.text().catch(()=>"");
      console.error("Flow error:", resp.status, t);
      throw new Error("Flow Power Automate en erreur");
    }

    alert("✅ Évaluation envoyée par e-mail avec le PDF en pièce jointe !");
  } catch (err) {
    console.error(err);
    alert("❌ Impossible de générer ou d’envoyer le PDF.");
  }
});

/* ================== APERÇU ÉCRAN ================== */
function afficherResultat(d) {
  let html = `<h2>Évaluation enregistrée</h2>`;
  html += `<strong>Employé :</strong> ${escapeHtml(d.nom)}<br>`;
  html += `<strong>Métier :</strong> ${escapeHtml(d.metier)}<br>`;
  html += `<strong>Date de naissance :</strong> ${escapeHtml(d.date_naissance)}<br>`;
  html += `<strong>Qualification :</strong> ${escapeHtml(d.qualification)}<br>`;
  html += `<strong>Date d’entrée :</strong> ${escapeHtml(d.date_entree)}<br>`;
  html += `<strong>Date de l’évaluation :</strong> ${escapeHtml(d.date_eval)}<br>`;
  html += `<strong>Auteur de l’évaluation :</strong> ${escapeHtml(d.auteur)}<br><br>`;

  html += `<strong>Critères :</strong><br>`;
  d.evaluation.forEach(row => {
    html += `• ${escapeHtml(row.critere)} : <strong>${escapeHtml(row.emoji)} ${escapeHtml(row.note)}</strong><br>`;
  });

  html += `<br><strong>Commentaire :</strong><br>${nl2br(escapeHtml(d.commentaire))}<br>`;
  html += `<br><strong>Compléments :</strong><br>`;
  html += `<strong>Fonctions :</strong> ${escapeHtml(d.fonctions)}<br>`;
  html += `<strong>Aspirations :</strong> ${escapeHtml(d.aspirations)}<br>`;
  html += `<strong>Formations :</strong> ${escapeHtml(d.formations)}<br>`;
  html += `<strong>Objectifs :</strong> ${escapeHtml(d.objectifs)}<br>`;
  html += `<strong>Remarques :</strong> ${escapeHtml(d.remarques)}<br>`;
  html += `<strong>Accidents :</strong> ${escapeHtml(d.accidents)}<br>`;
  html += `<strong>Évaluateur lu et approuvé :</strong> ${escapeHtml(d.approbateur)}<br>`;
  html += `<strong>Évalué lu et approuvé :</strong> ${escapeHtml(d.evalue)}<br>`;

  resultatDiv.innerHTML = html;
  resultatDiv.style.display = "block";
  window.scrollTo({ top: resultatDiv.offsetTop, behavior: "smooth" });
}

/* ================== PDF (jsPDF) ================== */
// ⚠️ On n'essaie pas d'imprimer les émojis dans le PDF (polices jsPDF par défaut ne les supportent pas)
function buildPdfWithJsPDF(d) {
  const { jsPDF } = (window.jspdf || {});
  if (!jsPDF) throw new Error("jsPDF introuvable – vérifie l’inclusion de la bibliothèque (jspdf.umd.min.js).");

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  // Titre
  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(249,115,22);
  doc.text("LixStaff – Évaluation du personnel", margin, y);
  y += 24;

  // Infos
  doc.setTextColor(0,0,0);
  doc.setFont('helvetica','normal');
  doc.setFontSize(11);

  const info = (label, val) => {
    newPageIfNeeded(16);
    doc.setFont('helvetica','bold'); doc.text(label + " ", margin, y);
    const w = doc.getTextWidth(label + " ");
    doc.setFont('helvetica','normal'); doc.text(String(val || ""), margin + w, y);
    y += 16;
  };

  info("Employé :", d.nom);
  info("Métier :", d.metier);
  info("Date de naissance :", d.date_naissance);
  info("Qualification :", d.qualification);
  info("Date d’entrée :", d.date_entree);
  info("Date de l’évaluation :", d.date_eval);
  info("Auteur :", d.auteur);
  info("Évaluateur lu et approuvé :", d.approbateur);
  info("Évalué lu et approuvé :", d.evalue);

  y += 8;

  // Critères (2 colonnes : Critère / Appréciation)
  section("Critères d’évaluation");
  tableHeader(["Critère", "Appréciation"], [480, 150]);
  d.evaluation.forEach(row => {
    tableRow([String(row.critere || ""), String(row.note || "")], [480, 150]);
  });

  // Commentaire
  section("Commentaire");
  y = multiText(d.commentaire || "", margin, y, pageW - margin*2) + 8;

  // Complément
  section("Complément d’évaluation");
  y = multiText(
    `• Fonctions : ${d.fonctions || ""}\n` +
    `• Aspirations : ${d.aspirations || ""}\n` +
    `• Formations : ${d.formations || ""}\n` +
    `• Objectifs : ${d.objectifs || ""}\n` +
    `• Remarques : ${d.remarques || ""}\n` +
    `• Accidents : ${d.accidents || ""}`,
    margin, y, pageW - margin*2
  );

  // ⚠️ On renvoie l'instance jsPDF (pas une dataURI)
  return doc;

  // Helpers PDF
  function newPageIfNeeded(extra=0){
    if (y + extra > pageH - margin){ doc.addPage(); y = margin; }
  }
  function section(t){
    newPageIfNeeded(24);
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(249,115,22);
    doc.text(t, margin, y); y += 16;
    doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.setTextColor(0,0,0);
  }
  function tableHeader(cols, widths){
    newPageIfNeeded(22);
    let x = margin;
    doc.setFont('helvetica','bold');
    cols.forEach((c,i)=>{ doc.text(c, x, y); x += widths[i]; });
    y += 12; doc.setLineWidth(0.5);
    doc.line(margin, y, margin + widths.reduce((a,b)=>a+b,0), y);
    y += 6; doc.setFont('helvetica','normal');
  }
  function tableRow(cols, widths){
    const rowH = 16; newPageIfNeeded(rowH + 6);
    let x = margin;
    cols.forEach((c,i)=>{
      const w = widths[i];
      const lines = doc.splitTextToSize(String(c||""), w-4);
      let yy = y; lines.forEach(line=>{ doc.text(line, x, yy); yy += 12; });
      x += w;
    });
    y += rowH; doc.setDrawColor(230); doc.setLineWidth(0.3);
    doc.line(margin, y, margin + widths.reduce((a,b)=>a+b,0), y);
    y += 6; doc.setDrawColor(0);
  }
  function multiText(text, x, yStart, width){
    const lines = doc.splitTextToSize(String(text||""), width);
    let yy = yStart;
    lines.forEach(line=>{ newPageIfNeeded(14); doc.text(line, x, yy); yy += 14; });
    return yy;
  }
}

/* ================== CONVERSION PDF → BASE64 ================== */
function pdfBase64FromDoc(doc) {
  // Sortie binaire puis conversion en base64 pour Flow
  const buffer = doc.output('arraybuffer');
  return base64FromArrayBuffer(buffer);
}
function base64FromArrayBuffer(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* ================== HTML POUR EMAIL (optionnel) ================== */
function buildEmailHtml(d){
  const rows = d.evaluation.map(r =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(r.critere)}</td>
      <td style="padding:4px 8px;border-bottom:1px solid #eee"><b>${escapeHtml(r.note)}</b></td>
    </tr>`
  ).join("");
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
    <h2 style="margin:0 0 12px">Évaluation du personnel</h2>
    <p><b>Employé :</b> ${escapeHtml(d.nom)}<br>
       <b>Métier :</b> ${escapeHtml(d.metier)}<br>
       <b>Date :</b> ${escapeHtml(d.date_eval)}<br>
       <b>Auteur :</b> ${escapeHtml(d.auteur)}</p>
    <h3 style="margin:16px 0 8px">Critères</h3>
    <table style="border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd">Critère</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd">Appréciation</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <h3 style="margin:16px 0 8px">Commentaire</h3>
    <p>${nl2br(escapeHtml(d.commentaire))}</p>
    <h3 style="margin:16px 0 8px">Compléments</h3>
    <ul>
      <li><b>Fonctions :</b> ${escapeHtml(d.fonctions)}</li>
      <li><b>Aspirations :</b> ${escapeHtml(d.aspirations)}</li>
      <li><b>Formations :</b> ${escapeHtml(d.formations)}</li>
      <li><b>Objectifs :</b> ${escapeHtml(d.objectifs)}</li>
      <li><b>Remarques :</b> ${escapeHtml(d.remarques)}</li>
      <li><b>Accidents :</b> ${escapeHtml(d.accidents)}</li>
      <li><b>Évaluateur :</b> ${escapeHtml(d.approbateur)}</li>
      <li><b>Évalué :</b> ${escapeHtml(d.evalue)}</li>
    </ul>
    <hr><p>📎 Le PDF complet est joint.</p>
  </div>`;
}

/* ================== HELPERS ================== */
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]))}
function nl2br(s){return String(s).replace(/\n/g,"<br>")}
function sanitizeFileName(s){return String(s).replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_")}
