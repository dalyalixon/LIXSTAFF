/* ================== CONFIG POWER AUTOMATE ================== */
const FLOW_URL = "https://default67f421526f984c3d8a955ed93c38ce.af.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/71d4d5c8f94f41848ddfc7bfb336ae8b/triggers/manual/paths/invoke/?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=nxFtQ01laXfNBx0t3SB-DLvAnvQ3zeBpOG6OsKBgovU";
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
const champChantier   = document.getElementById("chantier");
const selectOuvrier   = document.getElementById("ouvrierSelect");
const inputNaissance  = document.getElementById("dateNaissance");
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
let OUVRIERS = [];

async function chargerOuvriers() {
  if (Array.isArray(window.OUVRIERS) && window.OUVRIERS.length) {
    OUVRIERS = window.OUVRIERS;
    remplirSelectOuvriers(OUVRIERS);
    return;
  }

  try {
    const res = await fetch("/ouvriers.json", { cache: "no-store" });
    if (res.ok) {
      OUVRIERS = await res.json();
      remplirSelectOuvriers(OUVRIERS);
      return;
    }
  } catch (e) {
    console.error("Chargement échoué :", e);
  }
}

function remplirSelectOuvriers(list) {
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
selectOuvrier.addEventListener("change", () => {
  const o = OUVRIERS.find(x => (x.matricule ?? "").toString() === selectOuvrier.value);
  if (!o) return;
  inputQualif.value    = o.qualif ?? "";
  inputEntree.value    = normalizeDate(o.entree);
  inputNaissance.value = normalizeDate(o.naissance);   // ✅ nouvelle ligne

  if (o.fonction && selectMetier.querySelector(`option[value="${o.fonction}"]`)) {
    selectMetier.value = o.fonction;
    selectMetier.dispatchEvent(new Event("change"));
  }
});

/* ================== AFFICHAGE DES QUESTIONS ================== */
selectMetier.addEventListener("change", () => {
  const metier = selectMetier.value;
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

    questionsContainer.style.display = "block";
    commentaireSection.style.display  = "block";
    ficheComplementaire.style.display = "block";
  } else {
    questionsContainer.style.display = "none";
    commentaireSection.style.display  = "none";
    ficheComplementaire.style.display = "none";
  }
});

/* ================== COMMENTAIRE AUTO SI NOTE BASSE ================== */
function handleAutoComment(container, index) {
  let comment = container.querySelector(".auto-comment");
  if (index === 3 || index === 4) {
    if (!comment) {
      comment = document.createElement("textarea");
      comment.className = "auto-comment";
      comment.placeholder = "Commentaire obligatoire (note insuffisante/mauvaise)…";
      container.appendChild(comment);
    }
    comment.style.display = "";
    comment.required = true;
  } else if (comment) {
    comment.required = false;
    comment.style.display = "none";
  }
}

/* ================== HELPERS ================== */
function normalizeDate(v){
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0,10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

/* ================== INITIALISATION ================== */
document.addEventListener("DOMContentLoaded", () => {
  chargerOuvriers();
});
