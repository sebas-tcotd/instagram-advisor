#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import minimist from 'minimist';
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory';
import { GenerateCaption } from '../application/GenerateCaption';

const args = minimist(process.argv.slice(2));
const photo = (args._[0] ?? args.photo) as string | undefined;
const tone = (args.tone ?? 'narrativo') as string;

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

if (!photo) {
  console.error(`\n${RED}Uso: pnpm run caption -- <foto> [--tone narrativo|introspectivo|sensorial|proceso|tensión]${RESET}\n`);
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

console.log(`\n${BOLD}caption-generator${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Foto: ${photo} · Tono preferido: ${tone}${RESET}`);
console.log(`${DIM}Generando...${RESET}\n`);

try {
  const provider = createAIProvider();
  const useCase = new GenerateCaption(provider);
  const result = await useCase.execute({
    imageBase64,
    mimeType,
    tone: tone as 'narrativo' | 'introspectivo' | 'sensorial' | 'proceso' | 'tensión',
  });

  result.captions?.forEach((c, i) => {
    console.log(`${CYAN}${BOLD}── Versión ${i + 1} · ${c.tone} · hook: ${c.hook_type}${RESET}`);
    console.log(`\n${c.text}\n`);
  });

  if (result.notes) {
    console.log(`${DIM}Nota: ${result.notes}${RESET}\n`);
  }
} catch (e) {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`);
  process.exit(1);
}
