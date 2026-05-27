#!/usr/bin/env node
import 'dotenv/config';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from '../infrastructure/config/loadConfig';

const ROOT = process.cwd();

const checks = [
  { file: 'config.yaml',                label: 'Configuración del provider (config.yaml)' },
  { file: 'prompts/strategy.md',        label: 'Estrategia personal' },
  { file: 'prompts/post-advisor.md',    label: 'System prompt: post-advisor' },
  { file: 'prompts/caption-generator.md', label: 'System prompt: caption-generator' },
  { file: 'prompts/profile-auditor.md', label: 'System prompt: profile-auditor' },
  { file: 'profile.yaml',               label: 'Perfil (profile.yaml)' },
];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

console.log(`\n${BOLD}instagram-advisor — doctor${RESET}`);
console.log(`Verificando prerequisitos para @sebas_tcotd...\n`);

let allOk = true;

for (const { file, label } of checks) {
  const exists = existsSync(resolve(ROOT, file));
  const icon   = exists ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const status = exists ? '' : `${YELLOW} ← falta${RESET}`;
  console.log(`  ${icon}  ${label.padEnd(42)} ${file}${status}`);
  if (!exists) allOk = false;
}

// Check the correct API key based on the provider configured in config.yaml
console.log('');

try {
  const config = loadConfig();
  const provider = config.ai.provider;
  const apiKey = config.apiKey;

  const keyPresent = apiKey.length > 0;
  const keyVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'VITE_GEMINI_API_KEY';
  const icon   = keyPresent ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const keyStatus = keyPresent
    ? `${DIM}(provider: ${provider})${RESET}`
    : `${YELLOW} ← ${keyVar} no configurada${RESET}`;

  console.log(`  ${icon}  ${'API key configurada'.padEnd(42)} .env ${keyStatus}`);
  if (!keyPresent) {
    allOk = false;
  }
} catch (e) {
  console.log(`  ${RED}❌${RESET}  ${'API key configurada'.padEnd(42)} ${RED}No se pudo leer config.yaml: ${e instanceof Error ? e.message : String(e)}${RESET}`);
  allOk = false;
}

console.log('');
if (allOk) {
  console.log(`${GREEN}${BOLD}Todo listo.${RESET} Puedes ejecutar los comandos del advisor.\n`);
} else {
  console.log(`${RED}${BOLD}Faltan archivos o configuración.${RESET} Revisa los items marcados con ❌ antes de continuar.\n`);
  process.exit(1);
}
