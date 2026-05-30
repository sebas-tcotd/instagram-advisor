#!/usr/bin/env node
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createAIProvider } from '../infrastructure/ai/AIProviderFactory';
import { AuditProfile } from '../application/AuditProfile';
import { loadConfig } from '../infrastructure/config/loadConfig';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}profile-auditor${RESET} ${DIM}@sebas_tcotd${RESET}`);
console.log(`${DIM}Auditando perfil...${RESET}\n`);

async function main() {
  const config = loadConfig();
  const profileYaml = readFileSync(resolve(process.cwd(), config.profile_path), 'utf8');
  const provider = createAIProvider();
  const useCase = new AuditProfile(provider);
  const result = await useCase.execute(profileYaml);

  const scoreColor = result.overallScore >= 7 ? GREEN : result.overallScore >= 4 ? YELLOW : RED;
  console.log(`${scoreColor}${BOLD}Puntuación general: ${result.overallScore}/10${RESET}`);
  console.log(`${DIM}${result.status}${RESET}\n`);

  const urgentes = result.checklist.filter(i => i.priority === 'urgente');
  const importantes = result.checklist.filter(i => i.priority === 'importante');
  const mejoras = result.checklist.filter(i => i.priority === 'mejora');

  if (urgentes.length) {
    console.log(`${RED}${BOLD}— URGENTE —${RESET}`);
    for (const i of urgentes) {
      console.log(`  ${RED}${i.element}${RESET}: ${i.issue}`);
      console.log(`  ${DIM}→ ${i.action}${RESET}\n`);
    }
  }

  if (importantes.length) {
    console.log(`${YELLOW}${BOLD}— IMPORTANTE —${RESET}`);
    for (const i of importantes) {
      console.log(`  ${YELLOW}${i.element}${RESET}: ${i.issue}`);
      console.log(`  ${DIM}→ ${i.action}${RESET}\n`);
    }
  }

  if (mejoras.length) {
    console.log(`${DIM}${BOLD}— MEJORA —${RESET}`);
    for (const i of mejoras) {
      console.log(`  ${DIM}${i.element}${RESET}: ${i.issue}`);
      console.log(`  ${DIM}→ ${i.action}${RESET}\n`);
    }
  }

  if (result.wins?.length) {
    console.log(`${GREEN}${BOLD}Bien hecho:${RESET}`);
    for (const w of result.wins) {
      console.log(`  ${GREEN}✓${RESET} ${w}`);
    }
    console.log('');
  }
}

main().catch((e) => {
  console.error(`\n${RED}Error: ${e instanceof Error ? e.message : String(e)}${RESET}\n`);
  process.exit(1);
});
