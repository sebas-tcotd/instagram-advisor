# Requirements: instagram-advisor

**Defined:** 2026-05-26
**Core Value:** Un advisor de Instagram completo y arquitecturalmente ejemplar: cualquier developer puede clonar el repo, entender la estructura en minutos, y cambiar de proveedor de IA editando una línea en config.yaml.

## v1 Requirements

Requirements para el primer release público. Cada uno mapea a fases del roadmap.

### Migration

- [ ] **MIGR-01**: El codebase completo está escrito en TypeScript (src/, scripts/cli, vite.config.ts, tsconfig.json)
- [ ] **MIGR-02**: La estructura de carpetas sigue Clean Architecture: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/ui/`, `src/cli/`
- [ ] **MIGR-03**: `domain/` no contiene ningún import de `infrastructure/`, `ui/`, ni `cli/`
- [ ] **MIGR-04**: Los ports de dominio están definidos como interfaces TypeScript puras en `src/domain/ports/`

### Multi-Provider

- [ ] **PROV-01**: Existe `config.yaml` en la raíz con campos `ai.provider`, `ai.model`, `ai.max_tokens`, `prompts_dir`, `profile_path`
- [ ] **PROV-02**: `AIProviderFactory` lee `config.yaml` y retorna el provider correcto según `ai.provider`
- [ ] **PROV-03**: `GeminiProvider` implementa la interface `AIProvider` y usa la configuración de `config.yaml`
- [ ] **PROV-04**: `AnthropicProvider` implementa la interface `AIProvider` y usa la configuración de `config.yaml`
- [ ] **PROV-05**: Cambiar `ai.provider: gemini` a `ai.provider: anthropic` en config.yaml hace que toda la aplicación use Anthropic sin tocar código

### Agents — Core

- [ ] **AGNT-01**: El caso de uso `AnalyzePost` vive en `src/application/` y no conoce ni Gemini ni Anthropic — solo el port `AIProvider`
- [ ] **AGNT-02**: El caso de uso `GenerateCaption` vive en `src/application/` con la misma separación
- [ ] **AGNT-03**: El caso de uso `AuditProfile` vive en `src/application/` con la misma separación

### Profile Auditor

- [ ] **PROF-01**: El script CLI `npm run profile` (o `node cli/profile`) lee `profile.yaml` y llama al agente `profile-auditor`
- [ ] **PROF-02**: La web UI tiene un tab "Profile" que ejecuta el `AuditProfile` use case y muestra los resultados
- [ ] **PROF-03**: El resultado del profile audit muestra al menos: puntuación general, fortalezas, áreas de mejora, recomendaciones concretas

### UI

- [ ] **UI-01**: La UI usa Tailwind CSS v3+ como sistema de estilos (reemplazando el CSS plain actual)
- [ ] **UI-02**: La UI es responsive y usable en móvil (breakpoints mínimos: mobile 375px, tablet 768px)
- [ ] **UI-03**: Cada caption generado tiene un botón que copia el texto al clipboard con un click
- [ ] **UI-04**: La UI tiene un toggle de dark/light mode que persiste en localStorage
- [ ] **UI-05**: Los tres agentes (Analyze, Caption, Profile) están accesibles como tabs en la misma página

### Infrastructure & Developer Experience

- [ ] **INFR-01**: `npm run doctor` verifica que el provider configurado en config.yaml tenga su API key disponible en las vars de entorno
- [ ] **INFR-02**: `.env.example` documenta las variables de entorno para todos los providers soportados
- [ ] **INFR-03**: Conventional Commits está configurado (commitlint o equivalente) para que los commits sigan el formato `feat:`, `fix:`, `chore:`, etc.

### Repo Hygiene

- [ ] **REPO-01**: El repositorio tiene un archivo `LICENSE` (MIT)
- [ ] **REPO-02**: El repositorio tiene un tag de git `v0.1.0` que marca el primer release limpio
- [ ] **REPO-03**: GitHub Release Notes está configurado para auto-generar notas de release desde conventional commits al crear un tag

## v2 Requirements

Diferidos para una versión futura. Trackeados pero no en el roadmap actual.

### Feed Reviewer

- **FEED-01**: Script Playwright standalone (`scripts/feed-reviewer.ts`) que hace login en Instagram y scrapea los últimos 9 posts
- **FEED-02**: El feed-reviewer pasa los 9 posts al agente y recibe una evaluación de coherencia de feed
- **FEED-03**: El resultado se guarda en un archivo JSON/MD local para referencia

### Providers adicionales

- **PROV-06**: `OpenAIProvider` implementa `AIProvider` — agregar OpenAI como tercer provider soportado

### Notifications / Export

- **UI-06**: Exportar el resultado de un análisis como imagen PNG para compartir en redes

## Out of Scope

| Feature | Reason |
|---------|--------|
| Feed-reviewer UI tab | El scraper Playwright es standalone; añadir UI complica la arquitectura sin beneficio real en v1 |
| OpenAI provider | Gemini + Anthropic cubren los casos activos; OpenAI es over-engineering para v1 |
| Backend server | Stateless es correcto para esta herramienta; sin DB, sin servidor |
| Mobile app nativa | Web responsive es suficiente |
| GitHub Issues backlog | El backlog vive en .planning/; Issues es overhead innecesario |
| CHANGELOG.md manual | Automatizado via GitHub Release Notes desde conventional commits |

## Traceability

Actualizado durante la creación del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MIGR-01 | Phase 1 | Pending |
| MIGR-02 | Phase 1 | Pending |
| MIGR-03 | Phase 1 | Pending |
| MIGR-04 | Phase 1 | Pending |
| PROV-01 | Phase 1 | Pending |
| PROV-02 | Phase 1 | Pending |
| PROV-03 | Phase 1 | Pending |
| PROV-04 | Phase 1 | Pending |
| PROV-05 | Phase 1 | Pending |
| AGNT-01 | Phase 1 | Pending |
| AGNT-02 | Phase 1 | Pending |
| AGNT-03 | Phase 1 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| INFR-01 | Phase 4 | Pending |
| INFR-02 | Phase 4 | Pending |
| INFR-03 | Phase 4 | Pending |
| REPO-01 | Phase 4 | Pending |
| REPO-02 | Phase 4 | Pending |
| REPO-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-05-26*
*Last updated: 2026-05-26 after roadmap creation*
