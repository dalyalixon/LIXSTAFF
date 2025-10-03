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

/* Champs d’identification */
const champChantier   = document.getElementById("chantier");          // N° de chantier + nom
const selectOuvrier   = document.getElementById("ouvrierSelect");     // liste ouvriers
const inputNaissance  = document.getElementById("dateNaissance");     // peut rester vide (pas dans Excel)
const inputQualif     = document.getElementById("qualification");
const inputEntree     = document.getElementById("dateEntree");
const inputDateEval   = document.getElementById("dateEvaluation");
const inputInitial    = document.getElementById("initialEval");

/* ================== CHARGER LES MÉTIERS ================== */
Object.keys(METIER_QUESTIONS).forEach(metier => {
  const option = document.createElement("option");
  option.value = metier;
  option.textContent = metier;
  selectMetier.appendChild(option);
});

/* ================== REMPLIR LA LISTE DES OUVRIERS ================== */
/** On charge le fichier généré “ouvriers.json”. Structure attendue :
 *  [{ matricule, nom, prenom, entree: "YYYY-MM-DD", qualif, fonction }, ...]
 */
let OUVRIERS = [];
async function chargerOuvriers() {
  try {
    const res = await fetch("ouvriers.json", { cache: "no-store" });
    if (!res.ok) throw new Error("ouvriers.json introuvable");
    OUVRIERS = await res.json();
    remplirSelectOuvriers(OUVRIERS);
  } catch (e) {
    console.error("Chargement ouvriers échoué :", e);
  }
}

function remplirSelectOuvriers(list) {
  // on vide d’abord
  [...selectOuvrier.querySelectorAll("option:not(:first-child)")].forEach(o => o.remove());
  list.forEach(o => {
    const opt = document.createElement("option");
    const mat = (o.matricule ?? "").toString().trim();
    opt.value = mat;
    opt.textContent = `${(o.nom || "").toUpperCase()} ${(o.prenom || "").toUpperCase()} (Mat. ${mat})`;
    selectOuvrier.appendChild(opt);
  });
}

/* ================== AUTOFILL À LA SÉLECTION DE L’OUVRIER ================== */
selectOuvrier.addEventListener("change", () => {
  const o = OUVRIERS.find(x => (x.matricule ?? "").toString() === selectOuvrier.value);
  if (!o) return;
  // Remplissage automatique depuis Excel
  inputQualif.value   = (o.qualif ?? "").toString();
  inputEntree.value   = normalizeDate(o.entree);
  // Métier depuis “FONCTION”
  if (o.fonction && selectMetier.querySelector(`option[value="${o.fonction}"]`)) {
    selectMetier.value = o.fonction;
    // Déclencher l’affichage des questions si besoin
    selectMetier.dispatchEvent(new Event("change"));
  }
});

/* ================== AFFICHER LES QUESTIONS ================== */
selectMetier.addEventListener("change", () => {
  const metier = selectMetier.value;
  questionsList.innerHTML = "";

  if (metier && METIER_QUESTIONS[metier]) {
    METIER_QUESTIONS[metier].forEach((question) => {
      // conteneur par question (utile pour les commentaires conditionnels)
      const qDiv = document.createElement("div");
      qDiv.className = "question question-item";
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
        span.dataset.index = i; // 0..5
        span.onclick = () => {
          scale.querySelectorAll("span").forEach(s => s.classList.remove("selected"));
          span.classList.add("selected");

          // 👉 Si note 4e ou 5e (index 3 = Insuffisant, 4 = Mauvais) → commentaire obligatoire
          handleAutoComment(qDiv, i);
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

/* ================== COMMENTAIRE OBLIGATOIRE SI 4/5 ================== */
function handleAutoComment(container, index) {
  let comment = container.querySelector(".auto-comment");
  if (index === 3 || index === 4) {
    if (!comment) {
      comment = document.createElement("textarea");
      comment.className = "auto-comment";
      comment.placeholder = "Commentaire (obligatoire pour une note Insuffisant/Mauvais)…";
      comment.style.marginTop = "8px";
      comment.style.width = "100%";
      container.appendChild(comment);
    }
    comment.style.display = "";
    comment.required = true;
  } else if (comment) {
    comment.required = false;
    comment.style.display = "none";
  }
}

/* ================== SOUMISSION ================== */
document.getElementById("formEval").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Identification
  const chantier      = champChantier.value.trim();
  const ouvrierId     = selectOuvrier.value;
  const ouvrier       = OUVRIERS.find(x => (x.matricule ?? "").toString() === ouvrierId);
  const nomComplet    = ouvrier ? `${(ouvrier.nom||"").toUpperCase()} ${(ouvrier.prenom||"").toUpperCase()} (Mat. ${(ouvrier.matricule||"")})` : "";

  const metier        = selectMetier.value;
  const dateNaissance = inputNaissance.value;       // si fourni manuellement
  const qualification = inputQualif.value.trim();
  const dateEntree    = inputEntree.value;
  const dateEval      = inputDateEval.value;
  const initialEval   = inputInitial.value.trim();

  const commentaire   = document.getElementById("commentaire").value.trim();

  // Complément (tous NON obligatoires)
  const fonctions     = document.getElementById("fonctions").value.trim();
  const aspirations   = document.getElementById("aspirations").value.trim();
  const formations    = document.getElementById("formations").value.trim();
  const objectifs     = document.getElementById("objectifs").value.trim();
  const remarques     = document.getElementById("remarques").value.trim();
  const accidents     = document.getElementById("accidents").value.trim();

  const luEval        = document.getElementById("luEval").checked;
  const luEvalue      = document.getElementById("luEvalue").checked;

  // ✅ Champs vraiment obligatoires (d’après ta demande)
  if (!chantier || !ouvrierId || !metier || !dateEval || !initialEval || !luEval || !luEvalue) {
    alert("❌ Merci de remplir : N° de chantier, Ouvrier, Métier, Date d’évaluation, Initial de l’évaluateur et cocher les validations.");
    return;
  }

  // Vérifier que chaque question a une note + si 4/5 alors commentaire présent
  let questionsCompletes = true;
  let commentairesOK = true;
  const evaluations = [];
  document.querySelectorAll(".question").forEach(div => {
    const critere  = div.dataset.question;
    const selected = div.querySelector(".selected");
    if (!selected) questionsCompletes = false;

    // contrôle commentaire si 4/5
    const idx = selected ? Number(selected.dataset.index) : -1;
    const autoComment = div.querySelector(".auto-comment");
    if ((idx === 3 || idx === 4) && (!autoComment || autoComment.value.trim() === "")) {
      commentairesOK = false;
      if (autoComment) autoComment.reportValidity?.();
    }

    evaluations.push({
      critere,
      emoji: selected ? selected.dataset.icon  : "",
      note:  selected ? selected.dataset.value : "Non noté",
      commentaire: autoComment ? autoComment.value.trim() : ""
    });
  });

  if (!questionsCompletes) {
    alert("❌ Veuillez répondre à toutes les questions d'évaluation.");
    return;
  }
  if (!commentairesOK) {
    alert("❌ Pour toute note Insuffisant/Mauvais, un commentaire est obligatoire.");
    return;
  }

  // Construire l'objet résultat
  const result = {
    chantier,
    ouvrier: nomComplet,
    metier,
    date_naissance: dateNaissance,
    qualification,
    date_entree: dateEntree,
    date_eval: dateEval,
    initial_evaluateur: initialEval,
    commentaire,
    fonctions,
    aspirations,
    formations,
    objectifs,
    remarques,
    accidents,
    approbateur: luEval ? "Oui" : "Non",
    evalue:      luEvalue ? "Oui" : "Non",
    evaluation:  evaluations
  };

  // Aperçu écran (facultatif)
  afficherResultat(result);

  try {
    // ====== PDF complet en jsPDF ======
    const fileName = `${sanitizeFileName(nomComplet || "ouvrier")}_${sanitizeFileName(metier)}_evaluation.pdf`;
    const doc = buildPdfWithJsPDF(result);
    const base64 = pdfBase64FromDoc(doc);

    // Téléchargement local (pour test)
    if (btnDownload) {
      btnDownload.style.display = "inline-block";
      btnDownload.onclick = () => { doc.save(fileName); };
    }

    // ====== ENVOI AU FLOW (Power Automate) ======
    const headers = { "Content-Type": "application/json" };
    if (FLOW_API_KEY) headers["x-api-key"] = FLOW_API_KEY;

    const payload = {
      subject:  `Évaluation - ${nomComplet} (${metier}) – ${dateEval}`,
      filename: fileName,      // doit finir par .pdf
      pdfBase64: base64,       // côté Flow → base64ToBinary(triggerBody()?['pdfBase64'])
      data: {
        chantier,
        ouvrier: nomComplet,
        metier, dateEval,
        initial_evaluateur: initialEval,
        commentaire,
        fonctions, aspirations, formations, objectifs, remarques, accidents,
        approbateur: result.approbateur,
        evalue: result.evalue,
        evaluation: result.evaluation,
        emailBodyHtml: buildEmailHtml(result)
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
  html += `<strong>N° de chantier + nom :</strong> ${escapeHtml(d.chantier)}<br>`;
  html += `<strong>Ouvrier :</strong> ${escapeHtml(d.ouvrier)}<br>`;
  html += `<strong>Métier :</strong> ${escapeHtml(d.metier)}<br>`;
  if (d.date_naissance) html += `<strong>Date de naissance :</strong> ${escapeHtml(d.date_naissance)}<br>`;
  if (d.qualification)  html += `<strong>Qualification :</strong> ${escapeHtml(d.qualification)}<br>`;
  if (d.date_entree)    html += `<strong>Date d’entrée :</strong> ${escapeHtml(d.date_entree)}<br>`;
  html += `<strong>Date de l’évaluation :</strong> ${escapeHtml(d.date_eval)}<br>`;
  html += `<strong>Initial de l’évaluateur :</strong> ${escapeHtml(d.initial_evaluateur)}<br><br>`;

  html += `<strong>Critères :</strong><br>`;
  d.evaluation.forEach(row => {
    html += `• ${escapeHtml(row.critere)} : <strong>${escapeHtml(row.emoji)} ${escapeHtml(row.note)}</strong>`;
    if (row.commentaire) html += `<br><em>Commentaire :</em> ${escapeHtml(row.commentaire)}`;
    html += `<br>`;
  });

  if (d.commentaire) html += `<br><strong>Commentaire général :</strong><br>${nl2br(escapeHtml(d.commentaire))}<br>`;
  html += `<br><strong>Compléments :</strong><br>`;
  if (d.fonctions) html += `<strong>Fonctions exercées sur le chantier :</strong> ${escapeHtml(d.fonctions)}<br>`;
  if (d.aspirations) html += `<strong>Aspirations :</strong> ${escapeHtml(d.aspirations)}<br>`;
  if (d.formations) html += `<strong>Formations :</strong> ${escapeHtml(d.formations)}<br>`;
  if (d.objectifs) html += `<strong>Objectifs :</strong> ${escapeHtml(d.objectifs)}<br>`;
  if (d.remarques) html += `<strong>Remarques :</strong> ${escapeHtml(d.remarques)}<br>`;
  if (d.accidents) html += `<strong>Accidents :</strong> ${escapeHtml(d.accidents)}<br>`;
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

  info("N° de chantier + nom :", d.chantier);
  info("Ouvrier :", d.ouvrier);
  info("Métier :", d.metier);
  if (d.date_naissance) info("Date de naissance :", d.date_naissance);
  if (d.qualification)  info("Qualification :", d.qualification);
  if (d.date_entree)    info("Date d’entrée :", d.date_entree);
  info("Date de l’évaluation :", d.date_eval);
  info("Initial de l’évaluateur :", d.initial_evaluateur);
  info("Évaluateur lu et approuvé :", d.approbateur);
  info("Évalué lu et approuvé :", d.evalue);

  y += 8;

  // Critères (2 colonnes : Critère / Appréciation)
  section("Critères d’évaluation");
  tableHeader(["Critère", "Appréciation", "Commentaire"], [360, 120, 150]);
  d.evaluation.forEach(row => {
    tableRow([String(row.critere || ""), String(row.note || ""), String(row.commentaire || "")], [360, 120, 150]);
  });

  // Commentaire
  if (d.commentaire) {
    section("Commentaire général");
    y = multiText(d.commentaire || "", margin, y, pageW - margin*2) + 8;
  }

  // Complément
  section("Complément d’évaluation");
  y = multiText(
    `• Fonctions exercées sur le chantier : ${d.fonctions || ""}\n` +
    `• Aspirations : ${d.aspirations || ""}\n` +
    `• Formations : ${d.formations || ""}\n` +
    `• Objectifs : ${d.objectifs || ""}\n` +
    `• Remarques : ${d.remarques || ""}\n` +
    `• Accidents : ${d.accidents || ""}`,
    margin, y, pageW - margin*2
  );

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
      <td style="padding:4px 8px;border-bottom:1px solid #eee">${escapeHtml(r.commentaire || "")}</td>
    </tr>`
  ).join("");
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
    <h2 style="margin:0 0 12px">Évaluation du personnel</h2>
    <p>
       <b>N° de chantier + nom :</b> ${escapeHtml(d.chantier)}<br>
       <b>Ouvrier :</b> ${escapeHtml(d.ouvrier)}<br>
       <b>Métier :</b> ${escapeHtml(d.metier)}<br>
       <b>Date :</b> ${escapeHtml(d.date_eval)}<br>
       <b>Initial évaluateur :</b> ${escapeHtml(d.initial_evaluateur)}
    </p>
    <h3 style="margin:16px 0 8px">Critères</h3>
    <table style="border-collapse:collapse;width:100%">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd">Critère</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd">Appréciation</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd">Commentaire</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${d.commentaire ? `<h3 style="margin:16px 0 8px">Commentaire général</h3><p>${nl2br(escapeHtml(d.commentaire))}</p>` : ""}
    <h3 style="margin:16px 0 8px">Complément</h3>
    <ul>
      <li><b>Fonctions exercées sur le chantier :</b> ${escapeHtml(d.fonctions || "")}</li>
      <li><b>Aspirations :</b> ${escapeHtml(d.aspirations || "")}</li>
      <li><b>Formations :</b> ${escapeHtml(d.formations || "")}</li>
      <li><b>Objectifs :</b> ${escapeHtml(d.objectifs || "")}</li>
      <li><b>Remarques :</b> ${escapeHtml(d.remarques || "")}</li>
      <li><b>Accidents :</b> ${escapeHtml(d.accidents || "")}</li>
      <li><b>Évaluateur lu et approuvé :</b> ${escapeHtml(d.approbateur)}</li>
      <li><b>Évalué lu et approuvé :</b> ${escapeHtml(d.evalue)}</li>
    </ul>
    <hr><p>📎 Le PDF complet est joint.</p>
  </div>`;
}

/* ================== HELPERS ================== */
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]))}
function nl2br(s){return String(s).replace(/\n/g,"<br>")}
function sanitizeFileName(s){return String(s).replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_")}
function normalizeDate(v){
  if (!v) return "";
  // accepte Date, "YYYY-MM-DD" ou "DD/MM/YYYY"
  if (v instanceof Date) return v.toISOString().slice(0,10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

/* ================== BOOT ================== */
document.addEventListener("DOMContentLoaded", () => {
  chargerOuvriers(); // charge ouvriers.json et remplit la liste
});
