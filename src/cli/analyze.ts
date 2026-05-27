#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import minimist from 'minimist';
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory';
import { AnalyzePost } from '../application/AnalyzePost';

const args = minimist(process.argv.slice(2));
const photo = (args._[0] ?? args.photo) as string | undefined;
const caption = (args.caption ?? null) as string | null;
const format = (args.format ?? 'post_individual') as string;
const layer = (args.layer ?? 'externa') as string;

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

if (!photo) {
  console.error(`\n${RED}Uso: pnpm run analyze -- <foto> [--caption "texto"] [--format post_individual|carrusel|historia|reel] [--layer externa|interna|engineer]${RESET}\n`);
  process.exit(1);
}

const photoPath = resolve(process.cwd(), photo ?? '');
if (!existsSync(photoPath)) {
  console.error(`\n${RED}No se encuentra la foto: ${photoPath}${RESET}\n`);
  process.exit(1);
}

const MIME_MAP: Record<string, 'image/jpeg' | 'image/png' | 'image/webp'> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const ext = extname(photoPath).toLowerCase();
const mimeType = MIME_MAP[ext];
if (!mimeType) {
  console.error(`\n${RED}Formato no soportado: ${ext}. Usa JPG, PNG o WEBP.${RESET}\n`);
  process.exit(1);
}

const imageBase64 = readFileSync(photoPath).toString('base64');

const VALID_FORMATS = ['post_individual', 'carrusel', 'historia', 'reel'] as const;
type Format = typeof VALID_FORMATS[number];
if (!VALID_FORMATS.includes(format as Format)) {
  console.error(`\n${RED}Formato no válido: "${format}". Opciones: ${VALID_FORMATS.join(', ')}${RESET}\n`);
  process.exit(1);
}

const VALID_LAYERS = ['externa', 'interna', 'engineer'] as const;
type Layer = typeof VALID_LAYERS[number];
if (!VALID_LAYERS.includes(layer as Layer)) {
  console.error(`\n${RED}Capa no válida: "${layer}". Opciones: ${VALID_LAYERS.join(', ')}${RESET}\n`);
  process.exit(1);
}

console.log(`\n${BOLD}post-advisor${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Foto: ${photo} · Formato: ${format} · Capa: ${layer}${RESET}`);
console.log(`${DIM}Analizando...${RESET}\n`);

try {
  const provider = createAIProvider();
  const useCase = new AnalyzePost(provider);
  const result = await useCase.execute({
    imageBase64,
    mimeType,
    format: format as Format,
    layer: layer as Layer,
    caption: caption ?? undefined,
  });

  const verdictColor = result.verdict === 'listo' ? GREEN : result.verdict === 'ajustar' ? YELLOW : RED;
  const verdictLabel = result.verdict === 'listo' ? '✓ Listo para publicar' : result.verdict === 'ajustar' ? '⚠ Necesita ajustes' : '✕ No va al feed';

  console.log(`${verdictColor}${BOLD}${verdictLabel}${RESET}\n`);
  console.log(`${DIM}Visual:${RESET}  ${result.scores?.visual || '—'}    ${DIM}Caption:${RESET}  ${result.scores?.caption || '—'}    ${DIM}Fit:${RESET}  ${result.scores?.fit || '—'}\n`);
  console.log(`${result.analysis}\n`);

  if (result.suggestions?.length) {
    console.log(`${BOLD}Sugerencias:${RESET}`);
    result.suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    console.log('');
  }

} catch (e) {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`);
  process.exit(1);
}
