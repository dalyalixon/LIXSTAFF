/* ================== CONFIG POWER AUTOMATE ================== */
const FLOW_URL = "https://default67f421526f984c3d8a955ed93c38ce.af.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/71d4d5c8f94f41848ddfc7bfb336ae8b/triggers/manual/paths/invoke/?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=nxFtQ01laXfNBx0t3SB-DLvAnvQ3zeBpOG6OsKBgovU";
const FLOW_API_KEY = "";

/* ================== TYPE D'EVALUATION ================== */
const EVAL_TYPE = (document.body?.dataset?.type || "annuelle").toLowerCase();

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
const champChantier   = document.getElementById("chantier");
const selectOuvrier   = document.getElementById("ouvrierSelect");
const inputNaissance  = document.getElementById("dateNaissance");
const inputQualif     = document.getElementById("qualification");
const inputEntree     = document.getElementById("dateEntree");
const inputDateEval   = document.getElementById("dateEvaluation");
const inputInitial    = document.getElementById("initialEval");

/* Champs complémentaires */
const areaFonctions   = document.getElementById("fonctions");
const areaAspirations = document.getElementById("aspirations");
const areaFormations  = document.getElementById("formations");
const areaObjectifs   = document.getElementById("objectifs");
const areaRemarques   = document.getElementById("remarques");
const areaAccidents   = document.getElementById("accidents");

/* ================== CHARGER LES MÉTIERS ================== */
if (selectMetier && typeof METIER_QUESTIONS === "object") {
  Object.keys(METIER_QUESTIONS).forEach(metier => {
    const option = document.createElement("option");
    option.value = metier;
    option.textContent = metier;
    selectMetier.appendChild(option);
  });
}

/* ================== OUVRIERS: window.OUVRIERS > ./ouvriers.json ================== */
let OUVRIERS = [];

async function chargerOuvriers() {
  try {
    if (Array.isArray(window.OUVRIERS) && window.OUVRIERS.length) {
      OUVRIERS = window.OUVRIERS;
    } else {
      const res = await fetch("./ouvriers.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`ouvriers.json introuvable (HTTP ${res.status})`);
      OUVRIERS = await res.json();
    }
    remplirSelectOuvriers(OUVRIERS);
    if (!selectOuvrier || selectOuvrier.options.length <= 1) {
      console.warn("Liste ouvriers vide: vérifie le fichier ouvriers.js/ouvriers.json et le chemin.");
    }
  } catch (e) {
    console.error("Chargement ouvriers échoué :", e);
    alert("⚠️ Impossible de charger la liste des ouvriers.\nVérifie que 'ouvriers.js' (window.OUVRIERS) ou 'ouvriers.json' est bien déployé au même niveau.");
  }
}

function remplirSelectOuvriers(list) {
  if (!selectOuvrier) return;
  [...selectOuvrier.querySelectorAll("option:not(:first-child)")].forEach(o => o.remove());
  list.forEach(o => {
    const opt = document.createElement("option");
    const mat = (o.matricule ?? "").toString().trim();
    opt.value = mat;
    opt.textContent = `${(o.nom || "").toUpperCase()} ${(o.prenom || "").toUpperCase()} (Mat. ${mat})`;
    selectOuvrier.appendChild(opt);
  });
}
window.remplirSelectOuvriers = remplirSelectOuvriers;

/* ================== AUTO-FILL OUVRIER ================== */
if (selectOuvrier) {
  selectOuvrier.addEventListener("change", () => {
    const o = OUVRIERS.find(x => (x.matricule ?? "").toString() === selectOuvrier.value);
    if (!o) return;
    if (inputQualif)     inputQualif.value    = (o.qualif ?? "").toString();
    if (inputEntree)     inputEntree.value    = normalizeDate(o.entree);
    if (inputNaissance)  inputNaissance.value = normalizeDate(o.naissance);
    if (o.fonction && selectMetier?.querySelector(`option[value="${o.fonction}"]`)) {
      selectMetier.value = o.fonction;
      selectMetier.dispatchEvent(new Event("change"));
    }
  });
}

/* ================== AFFICHAGE DES QUESTIONS ================== */
if (selectMetier) {
  selectMetier.addEventListener("change", () => {
    const metier = selectMetier.value;
    if (!questionsList) return;
    questionsList.innerHTML = "";

    if (metier && METIER_QUESTIONS[metier]) {
      METIER_QUESTIONS[metier].forEach(question => {
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
          span.dataset.index = i;
          span.onclick = () => {
            scale.querySelectorAll("span").forEach(s => s.classList.remove("selected"));
            span.classList.add("selected");
            handleAutoComment(qDiv, i);
          };
          scale.appendChild(span);
        });

        qDiv.appendChild(labelEl);
        qDiv.appendChild(scale);
        questionsList.appendChild(qDiv);
      });

      if (questionsContainer)  questionsContainer.style.display = "block";
      if (commentaireSection)  commentaireSection.style.display  = "block";
      if (ficheComplementaire) ficheComplementaire.style.display = "block";
    } else {
      if (questionsContainer)  questionsContainer.style.display = "none";
      if (commentaireSection)  commentaireSection.style.display  = "none";
      if (ficheComplementaire) ficheComplementaire.style.display = "none";
    }
  });
}

/* ================== COMMENTAIRE AUTO SI NOTE BASSE ================== */
function handleAutoComment(container, index) {
  let comment = container.querySelector(".auto-comment");
  if (index === 3 || index === 4) {
    if (!comment) {
      comment = document.createElement("textarea");
      comment.className = "auto-comment";
      comment.placeholder = "Commentaire obligatoire (note insuffisante/mauvaise)…";
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
const form = document.getElementById("formEval");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const chantier      = (champChantier?.value || "").trim();
    const ouvrierId     = selectOuvrier?.value || "";
    const ouvrier       = OUVRIERS.find(x => (x.matricule ?? "").toString() === ouvrierId);
    const nomComplet    = ouvrier ? `${(ouvrier.nom||"").toUpperCase()} ${(ouvrier.prenom||"").toUpperCase()} (Mat. ${(ouvrier.matricule||"")})` : "";

    const metier        = selectMetier?.value || "";
    const dateNaissance = inputNaissance?.value || "";
    const qualification = inputQualif?.value.trim() || "";
    const dateEntree    = inputEntree?.value || "";
    const dateEval      = inputDateEval?.value || "";
    const initialEval   = inputInitial?.value.trim() || "";

    const commentaire   = (document.getElementById("commentaire")?.value || "").trim();

    const fonctions   = (areaFonctions?.value || "").trim();
    const aspirations = (areaAspirations?.value || "").trim();
    const formations  = (areaFormations?.value || "").trim();
    const objectifs   = (areaObjectifs?.value || "").trim();
    const remarques   = (areaRemarques?.value || "").trim();
    const accidents   = (areaAccidents?.value || "").trim();

    const luEval   = document.getElementById("luEval")?.checked || false;
    const luEvalue = document.getElementById("luEvalue")?.checked || false;

    // Champs obligatoires communs
    if (!chantier || !ouvrierId || !metier || !dateEval || !initialEval || !luEval || !luEvalue) {
      alert("❌ Merci de remplir : N° de chantier, Ouvrier, Métier, Date d’évaluation, Initial de l’évaluateur et cocher les validations.");
      return;
    }

    // Questions + commentaires
    let questionsCompletes = true;
    let commentairesOK = true;
    const evaluations = [];
    document.querySelectorAll(".question").forEach(div => {
      const critere  = div.dataset.question;
      const selected = div.querySelector(".selected");
      if (!selected) questionsCompletes = false;

      const idx = selected ? Number(selected.dataset.index) : -1;
      const autoComment = div.querySelector(".auto-comment");
      if ((idx === 3 || idx === 4) && (!autoComment || autoComment.value.trim() === "")) {
        commentairesOK = false;
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

    const result = {
      type: EVAL_TYPE, // "annuelle" | "periodique"
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
      aspirations, formations, objectifs, remarques, accidents,
      approbateur: luEval ? "Oui" : "Non",
      evalue:      luEvalue ? "Oui" : "Non",
      evaluation:  evaluations
    };

    afficherResultat(result);

    try {
      // PDF
      const fileName = `${sanitizeFileName(nomComplet || "ouvrier")}_${sanitizeFileName(metier)}_${EVAL_TYPE}.pdf`;
      const doc = buildPdfWithJsPDF(result);
      const base64 = pdfBase64FromDoc(doc);

      if (btnDownload) {
        btnDownload.style.display = "inline-block";
        btnDownload.onclick = () => { doc.save(fileName); };
      }

      // Envoi Flow
      const headers = { "Content-Type": "application/json" };
      if (FLOW_API_KEY) headers["x-api-key"] = FLOW_API_KEY;

      const typeLabel = (EVAL_TYPE === "periodique" ? "Périodique" : "Annuelle");
      const payload = {
        subject:  `Évaluation ${typeLabel} - ${nomComplet} (${metier}) – ${dateEval}`,
        filename: fileName,
        pdfBase64: base64,
        data: {
          ...result,
          nom: nomComplet,
          dateEval: dateEval,
          auteur: initialEval,
          emailBodyHtml: buildEmailHtml(result)
        }
      };

      const resp = await fetch(FLOW_URL, { method: "POST", headers, body: JSON.stringify(payload) });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("Flow error:", resp.status, text);
        alert(`❌ Échec envoi au Flow (HTTP ${resp.status}).\n${text.slice(0,600)}`);
        return;
        }
      alert("✅ Évaluation envoyée par e-mail avec le PDF en pièce jointe !");
    } catch (err) {
      console.error(err);
      alert("❌ Impossible de générer ou d’envoyer le PDF.");
    }
  });
}

/* ================== APERÇU / PDF / HELPERS ================== */
function afficherResultat(d) {
  if (!resultatDiv) return;
  let html = `<h2>Évaluation ${d.type === "periodique" ? "périodique" : "annuelle"} enregistrée</h2>`;
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
  if (d.fonctions)  html += `<strong>Fonctions exercées sur le chantier :</strong> ${escapeHtml(d.fonctions)}<br>`;
  if (d.type === "annuelle") {
    if (d.aspirations) html += `<strong>Aspirations :</strong> ${escapeHtml(d.aspirations)}<br>`;
    if (d.formations)  html += `<strong>Formations :</strong> ${escapeHtml(d.formations)}<br>`;
    if (d.objectifs)   html += `<strong>Objectifs :</strong> ${escapeHtml(d.objectifs)}<br>`;
    if (d.remarques)   html += `<strong>Remarques :</strong> ${escapeHtml(d.remarques)}<br>`;
    if (d.accidents)   html += `<strong>Accidents :</strong> ${escapeHtml(d.accidents)}<br>`;
  }
  html += `<strong>Évaluateur lu et approuvé :</strong> ${escapeHtml(d.approbateur)}<br>`;
  html += `<strong>Évalué lu et approuvé :</strong> ${escapeHtml(d.evalue)}<br>`;

  resultatDiv.innerHTML = html;
  resultatDiv.style.display = "block";
  window.scrollTo({ top: resultatDiv.offsetTop, behavior: "smooth" });
}

function buildPdfWithJsPDF(d) {
  const { jsPDF } = (window.jspdf || {});
  if (!jsPDF) throw new Error("jsPDF introuvable – vérifie l’inclusion de la bibliothèque (jspdf.umd.min.js).");

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.setTextColor(249,115,22);
  doc.text(`LixStaff – Évaluation ${d.type === "periodique" ? "périodique" : "annuelle"}`, margin, y);
  y += 24;

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

  section("Critères d’évaluation");
  tableHeader(["Critère", "Appréciation", "Commentaire"], [360, 120, 150]);
  d.evaluation.forEach(row => {
    tableRow([String(row.critere || ""), String(row.note || ""), String(row.commentaire || "")], [360, 120, 150]);
  });

  if (d.commentaire) {
    section("Commentaire général");
    y = multiText(d.commentaire || "", margin, y, pageW - margin*2) + 8;
  }

  section("Complément d’évaluation");
  let comp = `• Fonctions exercées sur le chantier : ${d.fonctions || ""}`;
  if (d.type === "annuelle") {
    comp += `\n• Aspirations : ${d.aspirations || ""}`;
    comp += `\n• Formations : ${d.formations || ""}`;
    comp += `\n• Objectifs : ${d.objectifs || ""}`;
    comp += `\n• Remarques : ${d.remarques || ""}`;
    comp += `\n• Accidents : ${d.accidents || ""}`;
  }
  y = multiText(comp, margin, y, pageW - margin*2);

  return doc;

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
    <h2 style="margin:0 0 12px">Évaluation ${d.type === "periodique" ? "périodique" : "annuelle"}</h2>
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
    <h3 style="margin:16px 0 8px">Complément</h3>
    <ul>
      <li><b>Fonctions exercées sur le chantier :</b> ${escapeHtml(d.fonctions || "")}</li>
      ${d.type === "annuelle" ? `
        <li><b>Aspirations :</b> ${escapeHtml(d.aspirations || "")}</li>
        <li><b>Formations :</b> ${escapeHtml(d.formations || "")}</li>
        <li><b>Objectifs :</b> ${escapeHtml(d.objectifs || "")}</li>
        <li><b>Remarques :</b> ${escapeHtml(d.remarques || "")}</li>
        <li><b>Accidents :</b> ${escapeHtml(d.accidents || "")}</li>` : ``}
      <li><b>Évaluateur lu et approuvé :</b> ${escapeHtml(d.approbateur)}</li>
      <li><b>Évalué lu et approuvé :</b> ${escapeHtml(d.evalue)}</li>
    </ul>
    <hr><p>📎 Le PDF complet est joint.</p>
  </div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]))}
function nl2br(s){return String(s).replace(/\n/g,"<br>")}
function sanitizeFileName(s){return String(s).replace(/[\\/:*?"<>|]/g,"_").replace(/\s+/g,"_")}
function normalizeDate(v){
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0,10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", () => {
  chargerOuvriers(); // remplit la liste
  const today = new Date().toISOString().slice(0, 10);
  if (inputDateEval && !inputDateEval.value) inputDateEval.value = today;
});
