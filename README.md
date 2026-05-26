# instagram-advisor

Agente de análisis estratégico de contenido para [@sebas_tcotd](https://www.instagram.com/sebas_tcotd/).

Evalúa fotos candidatas, genera captions, y audita el perfil contra la estrategia personal documentada en `prompts/strategy.md`.

---

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar API key
cp .env.example .env
# edita .env y pon tu ANTHROPIC_API_KEY

# 3. Verificar prerequisitos
npm run doctor
```

---

## Uso

### CLI directo

```bash
# Analizar foto candidata
npm run analyze -- foto.jpg
npm run analyze -- foto.jpg --caption "Mi caption aquí"
npm run analyze -- foto.jpg --format carrusel --layer interna

# Generar captions para una foto
npm run caption -- foto.jpg
npm run caption -- foto.jpg --tone introspectivo

# Verificar prerequisitos
npm run doctor
```

### Claude Code

```
/instagram analyze foto.jpg
/instagram analyze foto.jpg --caption "Mi caption" --format carrusel
/instagram caption foto.jpg --tone sensorial
/instagram profile
/instagram doctor
```

---

## Estructura

```
instagram-advisor/
├── SKILL.md                      # Entry point para Claude Code
├── profile.yaml                  # Datos fijos del perfil
├── package.json
├── .env.example
├── prompts/
│   ├── strategy.md               # Estrategia personal completa
│   ├── post-advisor.md           # Agente: análisis de post candidato
│   ├── caption-generator.md      # Agente: generación de captions
│   └── profile-auditor.md        # Agente: auditoría de perfil
├── scripts/
│   ├── doctor.js                 # Verificación de prerequisitos
│   ├── analyze.js                # CLI: post-advisor
│   └── caption.js                # CLI: caption-generator
└── src/
    └── index.html                # UI web (PoC visual)
```

---

## Agentes

| Agente | Comando | Función |
|---|---|---|
| `post-advisor` | `analyze` | Veredicto listo/ajustar/no va + scores + análisis |
| `caption-generator` | `caption` | 2 versiones de caption con tonos distintos |
| `profile-auditor` | `profile` | Checklist priorizado del estado del perfil |

---

## Notas

- Las fotos **no se commitean** (`.gitignore`). Pásalas por ruta relativa al ejecutar.
- El sistema prompt de cada agente carga automáticamente `strategy.md` + `profile.yaml` como contexto base.
- Para la UI web (`src/index.html`), necesitas un proxy o servidor local que inyecte el API key — no lo pongas directo en el HTML.
