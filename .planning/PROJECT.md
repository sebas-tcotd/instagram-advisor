# instagram-advisor

## What This Is

Herramienta personal de análisis de Instagram impulsada por IA — tres agentes core (post-advisor, caption-generator, profile-auditor) accesibles desde una web UI y CLI, con un feed-reviewer standalone via Playwright. Construida en TypeScript con Clean Architecture como showcase de SOLID y Desarrollo Dirigido por Agentes (DDA).

Objetivo público: publicar en LinkedIn/X como demostración de que se puede construir software bien estructurado usando agentes — no "vibe coding".

## Core Value

Un advisor de Instagram completo y arquitecturalmente ejemplar: cualquier developer puede clonar el repo, entender la estructura en minutos, y cambiar de proveedor de IA editando una línea en config.yaml.

## Requirements

### Validated

- ✓ post-advisor agent (análisis foto + caption) — existing, web UI + CLI
- ✓ caption-generator agent (genera captions con tone) — existing, web UI + CLI
- ✓ Vite + React UI operativa con Gemini — existing
- ✓ CLI scripts: analyze, caption, doctor — existing
- ✓ Prompt layer: strategy.md, post-advisor.md, caption-generator.md, profile-auditor.md — existing
- ✓ profile.yaml como contexto estructurado de identidad — existing
- ✓ Codebase mapeado (.planning/codebase/) — existing

### Active

- [ ] Migración completa a TypeScript (toda la codebase, incluyendo vite.config.ts, tsconfig.json)
- [ ] Restructura en Clean Architecture: domain/ application/ infrastructure/ ui/ cli/
- [ ] Soporte multi-provider via config.yaml (Gemini + Anthropic en v1; OpenAI en v2)
- [ ] AIProviderFactory que lea config.yaml y retorne el provider correcto
- [ ] profile-auditor: CLI script + tab en la web UI
- [ ] feed-reviewer: script Playwright standalone (sin UI tab) que scrapea los últimos 9 posts y evalúa coherencia del feed
- [ ] UI: tab de Profile en la web
- [ ] UI: dark/light mode toggle
- [ ] UI: botón "copiar caption al clipboard" en CaptionCard
- [ ] doctor script actualizado para verificar el provider configurado en config.yaml
- [ ] CHANGELOG.md mínimo con historial desde v0.1.0
- [ ] LICENSE (MIT o similar)
- [ ] Tag de versión inicial: v0.1.0

### Out of Scope

- Feed-reviewer UI tab — el scraper es un script standalone, no va en la web UI para v1
- OpenAI provider en v1 — Gemini + Anthropic son los dos casos de uso activos; OpenAI se agrega en v2
- Backend server / base de datos — stateless es una decisión arquitectural correcta para este caso
- Mobile app nativa — web responsive es suficiente para v1
- GitHub Issues como backlog GSD — el backlog vive en .planning/

## Context

El repo ya existe y tiene funcionalidad operativa en JavaScript puro. La migración a TypeScript + Clean Architecture no descarta código existente — lo reubica. La lógica de llamada a APIs pasa a `infrastructure/ai/`, los prompts .md quedan donde están, App.jsx se parte en components/hooks/pages, los scripts CLI pasan a `cli/commands/`.

La decisión de no tener backend server fue deliberada: la web UI llama a Gemini directamente desde el browser; los CLI scripts llaman a Anthropic via SDK. Esta arquitectura dual-provider (Gemini en UI, Anthropic en CLI) es lo que el multi-provider support unifica bajo un config.yaml.

Contexto de publicación: el repo será mostrado como ejemplo de Desarrollo Dirigido por Agentes — la estructura del código y los commits deben reflejar intención y calidad, no solo funcionalidad.

## Constraints

- **Tech stack**: TypeScript + React 18 + Vite 6 — no cambiar el stack frontend
- **Sin backend**: stateless por decisión de diseño — la UI llama APIs directamente con VITE_ env vars
- **Clean Architecture**: `domain/` no puede importar de `infrastructure/`, `ui/`, ni `cli/` — jamás
- **Showcase**: el código debe ser legible y ejemplar — no solo funcional
- **Playwright**: el feed-reviewer usa Playwright para scraping; requiere login de Instagram en las vars de entorno

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript completo | Showcase de calidad de código + type safety real | — Pending |
| Clean Architecture con ports/adapters | Demostrar SOLID aplicado; el AIProvider como abstracción es el ejemplo perfecto | — Pending |
| Multi-provider via config.yaml | Ya se usa Gemini en UI y Anthropic en CLI; unificarlos es la necesidad inmediata | — Pending |
| Feed-reviewer como script standalone (no UI) | Playwright + Instagram login es complejidad que no pertenece en la web UI | — Pending |
| Sin OpenAI en v1 | Gemini + Anthropic cubren los casos activos; OpenAI es over-engineering para v1 | — Pending |

## Evolution

Este documento evoluciona en cada transición de fase y milestone.

**Después de cada fase** (via `/gsd-transition`):
1. ¿Requisitos invalidados? → Mover a Out of Scope con razón
2. ¿Requisitos validados? → Mover a Validated con referencia de fase
3. ¿Nuevos requisitos emergieron? → Agregar a Active
4. ¿Decisiones a registrar? → Agregar a Key Decisions
5. ¿"What This Is" sigue siendo preciso? → Actualizar si deriva

**Después de cada milestone** (via `/gsd-complete-milestone`):
1. Revisión completa de todas las secciones
2. Core Value check — ¿sigue siendo la prioridad correcta?
3. Audit Out of Scope — ¿las razones siguen siendo válidas?
4. Actualizar Context con el estado actual

---
*Last updated: 2026-05-26 after initialization*
