# Design Reviewer

Herramienta para comparar exports de Figma contra capturas de QA/STG, usando Claude como reviewer visual.

## Setup

1. Clona el repo
2. Abre `reviewer.js` y pega tu Anthropic API key en `API_KEY`
3. Agrega tu `tokens.md` con los design tokens del sistema
4. Abre `index.html` en el browser (o usa Live Server en VS Code)

## Uso

1. Escribe el nombre de la pantalla
2. Sube el export de Figma (PNG/JPG)
3. Sube la captura de QA/STG
4. Presiona **Revisar** — Claude compara ambas imágenes y devuelve el reporte

## Output

El reviewer reporta en este formato:

```
## Revisión: [nombre de pantalla]
### ❌ Gaps encontrados
- [elemento] Descripción del problema
### ✅ Lo que está bien
- Resumen breve
```

## Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | UI de la herramienta |
| `styles.css` | Estilos |
| `reviewer.js` | Lógica + llamada a la API |
| `tokens.md` | Tus design tokens (agregar manualmente) |

## ⚠️ Seguridad

Nunca subas `reviewer.js` con la API key hardcodeada a un repo **público**.
Para uso en equipo, considera un backend proxy que maneje la key.
