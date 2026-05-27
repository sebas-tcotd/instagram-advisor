import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { AppConfig } from '../config/loadConfig';

/**
 * Assembles the full system prompt for an agent by concatenating:
 *   1. The agent-specific prompt file (from prompts_dir)
 *   2. The strategy context (strategy.md)
 *   3. The profile YAML (profile_path)
 *
 * Shared by AnthropicProvider and GeminiProvider to avoid duplication.
 */
export function assembleSystemPrompt(promptFile: string, config: AppConfig): string {
  const promptsDir = resolve(process.cwd(), config.prompts_dir);
  const agentPrompt = readFileSync(resolve(promptsDir, promptFile), 'utf8');
  const strategy = readFileSync(resolve(promptsDir, 'strategy.md'), 'utf8');
  const profile = readFileSync(resolve(process.cwd(), config.profile_path), 'utf8');
  return `${agentPrompt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}`;
}
