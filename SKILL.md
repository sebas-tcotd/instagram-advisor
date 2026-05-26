# instagram-advisor

Skill de análisis estratégico de contenido para @sebas_tcotd.

Evalúa fotos candidatas, captions, y estado del perfil contra la estrategia personal documentada en `prompts/strategy.md`.

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `/instagram analyze <foto>` | Analiza foto + caption opcional como post candidato |
| `/instagram caption <foto>` | Genera borrador de caption para una foto |
| `/instagram profile` | Audita el estado actual del perfil contra la estrategia |
| `npm run analyze -- --photo <foto>` | Alternativa CLI sin Claude Code |
| `npm run caption -- --photo <foto>` | Alternativa CLI para generación de caption |

---

## Prerequisitos

Antes de ejecutar cualquier comando, verifica que existan estos archivos:

| Archivo | Requerido | Descripción |
|---|---|---|
| `prompts/strategy.md` | ✅ Sí | Estrategia personal de @sebas_tcotd |
| `prompts/post-advisor.md` | ✅ Sí | System prompt del agente principal |
| `prompts/caption-generator.md` | ✅ Sí | System prompt del generador de captions |
| `prompts/profile-auditor.md` | ✅ Sí | System prompt del auditor de perfil |
| `profile.yaml` | ✅ Sí | Datos fijos del perfil |
| `.env` | ✅ Sí | `ANTHROPIC_API_KEY=sk-...` |

Ejecuta `npm run doctor` para verificar el estado de todos los prerequisitos.

---

## Cómo funciona

Cada agente carga `prompts/strategy.md` + `profile.yaml` como contexto base, luego aplica su system prompt específico. El resultado siempre incluye veredicto, scores por dimensión, y análisis narrativo calibrado a la voz y estrategia de Sebas.

---

## Flujo de `/instagram analyze`

```
foto (+ caption opcional)
        ↓
  post-advisor.md (system prompt)
        ↓
  [skill: photo-analyzer]     → composición, tono, coherencia B&N
  [skill: caption-analyzer]   → hook, estructura, voz, CTA
  [skill: fit-checker]        → coherencia foto ↔ caption
        ↓
  veredicto: listo / ajustar / no va
  scores: visual / caption / fit
  análisis narrativo
```
