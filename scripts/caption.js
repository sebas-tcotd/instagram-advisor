#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import minimist from 'minimist';
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const ROOT  = resolve(import.meta.dirname, '..');
const args  = minimist(process.argv.slice(2));
const photo = args._[0] || args.photo;
const tone  = args.tone || 'narrativo';

const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const CYAN  = '\x1b[36m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';

if (!photo) {
  console.error(`\n${RED}Uso: npm run caption -- <foto> [--tone narrativo|introspectivo|sensorial|proceso|tension]${RESET}\n`);
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
const systemPmt = readFileSync(resolve(ROOT, 'prompts/caption-generator.md'), 'utf8');
const profile   = readFileSync(resolve(ROOT, 'profile.yaml'), 'utf8');
const imageData = readFileSync(photoPath).toString('base64');

const userText = `Genera captions para esta foto de @sebas_tcotd.
Tono preferido: ${tone}
Genera 2 versiones con tonos distintos. Responde ÚNICAMENTE con el JSON especificado.`;

console.log(`\n${BOLD}caption-generator${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Foto: ${photo} · Tono preferido: ${tone}${RESET}`);
console.log(`${DIM}Generando...${RESET}\n`);

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

parsed.captions?.forEach((c, i) => {
  console.log(`${CYAN}${BOLD}── Versión ${i + 1} · ${c.tone} · hook: ${c.hook_type}${RESET}`);
  console.log(`\n${c.text}\n`);
});

if (parsed.notes) {
  console.log(`${DIM}Nota: ${parsed.notes}${RESET}\n`);
}
