// ─── Config ──────────────────────────────────────────────────────────────────
// Agrega tu API key de Anthropic aquí, o usa una variable de entorno si tienes
// un backend. NUNCA subas este archivo con la key hardcodeada a un repo público.
const API_KEY = "";  // ← pegar key aquí para uso local

// ─── Estado ──────────────────────────────────────────────────────────────────
const images = { figma: null, qa: null };

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
    const headers = { "Content-Type": "application/json" };
    if (API_KEY) headers["x-api-key"] = API_KEY;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Pantalla: "${screenName}"\n\nPrimera imagen: export de Figma. Segunda imagen: captura de QA/STG.`,
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: images.figma.mediaType,
                  data: images.figma.base64,
                },
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: images.qa.mediaType,
                  data: images.qa.base64,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Error en la API");

    const text = data.content.map(b => b.text || "").join("\n").trim();
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
  // Lee los tokens desde tokens.md si los tienes en el repo, o edita aquí.
  // Por defecto incluye un resumen de los tokens del sistema.
  return `Eres un senior product designer revisando pantallas de un prototipo.

Recibirás DOS imágenes:
1. El export de Figma (diseño de referencia)
2. La captura de QA/STG (implementación real)

Revisa contra, y solo contra:

- **Drift visual vs Figma**: layout, jerarquía, componentes, colores, espaciados, tipografía. Marca cualquier diferencia visible.
- **Tokens del sistema**: cualquier color, espaciado o radio que NO coincida con los tokens válidos definidos en tokens.md de este repo.
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
---`;
}
