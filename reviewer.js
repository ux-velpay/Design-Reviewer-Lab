// ─── Config ──────────────────────────────────────────────────────────────────
// Obtén tu key GRATIS en: aistudio.google.com → Get API key
// NUNCA subas este archivo con la key hardcodeada a un repo público.
const API_KEY = "";  // ← pegar key de Google AI Studio aquí

// ─── Estado ──────────────────────────────────────────────────────────────────
const images = { figma: null, qa: null };

// ─── Tokens ───────────────────────────────────────────────────────────────────
const TOKENS_KEY = "design-reviewer:tokens";

function initTokens() {
  const saved = localStorage.getItem(TOKENS_KEY) || "";
  document.getElementById("tokens-input").value = saved;
  updateTokensBadge(saved);
}

function saveTokens() {
  const val = document.getElementById("tokens-input").value;
  localStorage.setItem(TOKENS_KEY, val);
  updateTokensBadge(val);
}

function clearTokens() {
  document.getElementById("tokens-input").value = "";
  localStorage.removeItem(TOKENS_KEY);
  updateTokensBadge("");
}

function loadTokensFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById("tokens-input").value = e.target.result;
    saveTokens();
  };
  reader.readAsText(file);
  input.value = "";
}

function updateTokensBadge(content) {
  const badge = document.getElementById("tokens-badge");
  const hasTokens = content.trim().length > 0;
  badge.textContent = hasTokens ? "Activos" : "Sin tokens";
  badge.className = "tokens-badge" + (hasTokens ? " active" : "");
}

function toggleTokens() {
  const body = document.getElementById("tokens-body");
  const chevron = document.getElementById("tokens-chevron");
  const open = body.classList.toggle("open");
  chevron.classList.toggle("open", open);
}

initTokens();

// ─── Uploads ─────────────────────────────────────────────────────────────────
function handleUpload(type, input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    images[type] = {
      base64: dataUrl.split(",")[1],
      mediaType: file.type || "image/png",
      name: file.name,
    };

    document.getElementById("preview-" + type).src = dataUrl;
    document.getElementById("name-" + type).textContent = file.name;
    document.getElementById("zone-" + type).classList.add("has-image");

    updateBtn();
  };
  reader.readAsDataURL(file);
}

function updateBtn() {
  document.getElementById("review-btn").disabled = !(images.figma && images.qa);
}

// ─── Review ──────────────────────────────────────────────────────────────────
async function runReview() {
  const screenName =
    document.getElementById("screen-name").value.trim() || "Pantalla sin nombre";
  const btn    = document.getElementById("review-btn");
  const result = document.getElementById("result");
  const body   = document.getElementById("result-body");
  const dot    = document.getElementById("status-dot");
  const title  = document.getElementById("result-title");

  btn.disabled = true;
  result.classList.add("visible");
  body.className = "result-body loading-text";
  body.textContent = "Comparando Figma vs QA contra los design tokens...";
  dot.className = "status-dot";
  title.textContent = "Analizando...";

  try {
    if (!API_KEY) throw new Error("API key no configurada. Obtén tu key gratis en aistudio.google.com y pégala en reviewer.js (variable API_KEY).");

    const systemPrompt = buildSystemPrompt();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: `Pantalla: "${screenName}"\n\nPrimera imagen: export de Figma. Segunda imagen: captura de QA/STG.` },
              { inlineData: { mimeType: images.figma.mediaType, data: images.figma.base64 } },
              { inlineData: { mimeType: images.qa.mediaType,   data: images.qa.base64   } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 1200 },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Error en la API");

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim() || "Sin respuesta";
    body.className = "result-body";
    body.textContent = text;
    dot.className = "status-dot done";
    title.textContent = "Revisión completa";
  } catch (err) {
    body.className = "result-body error-text";
    body.textContent = "Error: " + err.message;
    dot.className = "status-dot error";
    title.textContent = "Error";
  } finally {
    btn.disabled = false;
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  const tokens = (localStorage.getItem(TOKENS_KEY) || "").trim();
  const tokensSection = tokens
    ? `\n\n## Design tokens de referencia\n\`\`\`\n${tokens}\n\`\`\`\nCualquier color, espaciado o radio que NO aparezca aquí es un token inválido y debe reportarse.`
    : "\n\n(No se cargaron design tokens. Evalúa colores y espaciados visualmente comparando las dos imágenes.)";

  return `Eres un senior product designer revisando pantallas de un prototipo.

Recibirás DOS imágenes:
1. El export de Figma (diseño de referencia)
2. La captura de QA/STG (implementación real)

Revisa contra, y solo contra:

- **Drift visual vs Figma**: layout, jerarquía, componentes, colores, espaciados, tipografía. Marca cualquier diferencia visible.
- **Tokens del sistema**: cualquier color, espaciado o radio que NO coincida con los tokens válidos.
- **Estados requeridos**: la pantalla debe tener estado vacío, carga, error y éxito. Marca los que falten.
- **Touch targets**: mínimo 44px. Marca los elementos interactivos visualmente pequeños.

Reporta solo lo que está roto o falta. Sin opiniones de estilo. Sin sugerencias de features.

Formato de salida EXACTO:

---
## Revisión: [nombre de pantalla]
### ❌ Gaps encontrados
- [elemento] Descripción del problema
### ✅ Lo que está bien
- Resumen breve
---${tokensSection}`;
}
