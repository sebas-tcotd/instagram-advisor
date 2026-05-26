#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import minimist from 'minimist';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const ROOT   = resolve(import.meta.dirname, '..');
const args   = minimist(process.argv.slice(2));
const photo  = args._[0] || args.photo;
const caption = args.caption || null;
const format  = args.format  || 'post_individual';
const layer   = args.layer   || 'externa';

const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';

if (!photo) {
  console.error(`\n${RED}Uso: npm run analyze -- <foto> [--caption "texto"] [--format post|carrusel|historia|reel] [--layer externa|interna|engineer]${RESET}\n`);
  process.exit(1);
}

const photoPath = resolve(process.cwd(), photo);
if (!existsSync(photoPath)) {
  console.error(`\n${RED}No se encuentra la foto: ${photoPath}${RESET}\n`);
  process.exit(1);
}

const MIME_MAP = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const ext = extname(photoPath).toLowerCase();
const mimeType = MIME_MAP[ext];
if (!mimeType) {
  console.error(`\n${RED}Formato no soportado: ${ext}. Usa JPG, PNG o WEBP.${RESET}\n`);
  process.exit(1);
}

const strategy  = readFileSync(resolve(ROOT, 'prompts/strategy.md'), 'utf8');
const systemPmt = readFileSync(resolve(ROOT, 'prompts/post-advisor.md'), 'utf8');
const profile   = readFileSync(resolve(ROOT, 'profile.yaml'), 'utf8');
const imageData = readFileSync(photoPath).toString('base64');

const formatLabels = { post_individual: 'post individual', carrusel: 'carrusel (slide 1)', historia: 'historia', reel: 'reel thumbnail' };
const layerLabels  = { externa: 'capa externa', interna: 'capa interna', engineer: 'capa engineer/tech' };

const userText = `Analiza este post candidato para @sebas_tcotd.

Formato: ${formatLabels[format] || format}
Capa de contenido: ${layerLabels[layer] || layer}
${caption ? `Caption: "${caption}"` : 'Sin caption — evalúa desde la imagen y sugiere ángulo narrativo.'}

Responde ÚNICAMENTE con el JSON especificado en tu system prompt. Sin texto antes ni después.`;

console.log(`\n${BOLD}post-advisor${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Foto: ${photo} · Formato: ${format} · Capa: ${layer}${RESET}`);
console.log(`${DIM}Analizando...${RESET}\n`);

const client = new Anthropic();

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: `${systemPmt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}`,
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
      { type: 'text', text: userText }
    ]
  }]
});

const raw = response.content.map(b => b.text || '').join('').trim();

let parsed;
try {
  const match = raw.match(/\{[\s\S]*\}/);
  parsed = JSON.parse(match ? match[0] : raw);
} catch {
  console.error(`${RED}Error al parsear respuesta:${RESET}\n${raw}`);
  process.exit(1);
}

const verdictColor = parsed.verdict === 'listo' ? GREEN : parsed.verdict === 'ajustar' ? YELLOW : RED;
const verdictLabel = parsed.verdict === 'listo' ? '✓ Listo para publicar' : parsed.verdict === 'ajustar' ? '⚠ Necesita ajustes' : '✕ No va al feed';

console.log(`${verdictColor}${BOLD}${verdictLabel}${RESET}\n`);
console.log(`${DIM}Visual:${RESET}  ${parsed.scores?.visual || '—'}    ${DIM}Caption:${RESET}  ${parsed.scores?.caption || '—'}    ${DIM}Fit:${RESET}  ${parsed.scores?.fit || '—'}\n`);
console.log(`${parsed.analysis}\n`);

if (parsed.suggestions?.length) {
  console.log(`${BOLD}Sugerencias:${RESET}`);
  parsed.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
}
