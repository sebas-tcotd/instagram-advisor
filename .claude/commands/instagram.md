# /instagram — Instagram Advisor para @sebas_tcotd

Comando principal del instagram-advisor. Analiza posts candidatos, genera captions, y audita el perfil contra la estrategia documentada.

---

## Uso

```
/instagram analyze <ruta-foto> [--caption "texto"] [--format post|carrusel|historia|reel] [--layer externa|interna|engineer]
/instagram caption <ruta-foto> [--tone narrativo|introspectivo|sensorial|proceso|tension]
/instagram profile
/instagram doctor
```

---

## Instrucciones para Claude Code

Cuando se invoque este comando:

1. **Lee siempre primero** `prompts/strategy.md` y `profile.yaml` — son el contexto base de todos los agentes.

2. **Según el subcomando:**

### `analyze`
- Carga `prompts/post-advisor.md` como system prompt
- Si se pasa `--caption`, inclúyelo en el análisis
- Si no hay caption, evalúa solo desde la imagen y sugiere ángulo narrativo
- Parámetros opcionales con defaults: `--format post_individual`, `--layer externa`
- Output: veredicto (listo/ajustar/no va), scores (visual/caption/fit), análisis narrativo, sugerencias concretas

### `caption`
- Carga `prompts/caption-generator.md` como system prompt
- Genera 2 versiones con tonos distintos
- Default `--tone narrativo` si no se especifica
- Output: 2 captions con tone, hook_type, y texto completo + nota de recomendación

### `profile`
- Carga `prompts/profile-auditor.md` como system prompt
- Pide al usuario que describa el estado actual del perfil (bio, foto de perfil, highlights, últimos posts) o que pegue capturas
- Output: score overall, checklist priorizado (urgente/importante/mejora), wins

### `doctor`
- Verifica que existan todos los archivos prerequisito
- Verifica que `.env` tenga `ANTHROPIC_API_KEY`
- Muestra tabla de estado con ✅ / ❌ por archivo
- No requiere API — solo filesystem checks

3. **Formato de output siempre en español** — es la lengua de trabajo del perfil.

4. **Tono del feedback:** directo, específico, calibrado a Sebas. No genérico. Menciona qué funciona antes de qué falla.
