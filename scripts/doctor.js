#!/usr/bin/env node
import { existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

const checks = [
  { file: 'prompts/strategy.md',        label: 'Estrategia personal' },
  { file: 'prompts/post-advisor.md',    label: 'System prompt: post-advisor' },
  { file: 'prompts/caption-generator.md', label: 'System prompt: caption-generator' },
  { file: 'prompts/profile-auditor.md', label: 'System prompt: profile-auditor' },
  { file: 'profile.yaml',               label: 'Perfil (profile.yaml)' },
  { file: '.env',                        label: 'Variables de entorno (.env)' },
  { file: 'src/index.html',             label: 'UI web (src/index.html)' },
];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

console.log(`\n${BOLD}instagram-advisor — doctor${RESET}`);
console.log(`Verificando prerequisitos para @sebas_tcotd...\n`);

let allOk = true;

for (const { file, label } of checks) {
  const exists = existsSync(resolve(ROOT, file));
  const icon   = exists ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const status = exists ? '' : `${YELLOW} ← falta${RESET}`;
  console.log(`  ${icon}  ${label.padEnd(38)} ${file}${status}`);
  if (!exists) allOk = false;
}

// Check ANTHROPIC_API_KEY inside .env if it exists
if (existsSync(resolve(ROOT, '.env'))) {
  const { readFileSync } = await import('fs');
  const env = readFileSync(resolve(ROOT, '.env'), 'utf8');
  const hasKey = env.includes('ANTHROPIC_API_KEY=') && !env.includes('ANTHROPIC_API_KEY=your_key');
  const icon   = hasKey ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const status = hasKey ? '' : `${YELLOW} ← ANTHROPIC_API_KEY no configurada${RESET}`;
  console.log(`  ${icon}  ${'API key configurada'.padEnd(38)} .env${status}`);
  if (!hasKey) allOk = false;
}

console.log('');
if (allOk) {
  console.log(`${GREEN}${BOLD}Todo listo.${RESET} Puedes ejecutar los comandos del advisor.\n`);
} else {
  console.log(`${RED}${BOLD}Faltan archivos.${RESET} Revisa los items marcados con ❌ antes de continuar.\n`);
  process.exit(1);
}
