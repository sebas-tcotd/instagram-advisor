import { readFileSync } from 'fs';
import { resolve } from 'path';
import { load } from 'js-yaml';

export interface AppConfig {
  ai: {
    provider: 'gemini' | 'anthropic';
    model: string;
    max_tokens: number;
  };
  prompts_dir: string;
  profile_path: string;
  apiKey: string; // injected from env, not stored in config.yaml
}

type RawConfig = {
  ai: {
    provider: string;
    model: string;
    max_tokens: number;
  };
  prompts_dir: string;
  profile_path: string;
};

/**
 * Reads config.yaml from the repo root and returns a fully typed AppConfig.
 * Injects the API key from process.env based on the configured provider.
 *
 * @param configPath - Optional absolute path to config.yaml (defaults to CWD/config.yaml)
 * @throws Error if config.yaml is not found or ai.provider is invalid
 */
export function loadConfig(configPath?: string): AppConfig {
  const resolvedPath = configPath ?? resolve(process.cwd(), 'config.yaml');

  let raw: string;
  try {
    raw = readFileSync(resolvedPath, 'utf8');
  } catch {
    throw new Error('config.yaml not found');
  }

  const parsed = load(raw) as RawConfig;

  const provider = parsed?.ai?.provider;
  if (provider !== 'gemini' && provider !== 'anthropic') {
    throw new Error("ai.provider must be 'gemini' or 'anthropic'");
  }

  const apiKey =
    provider === 'anthropic'
      ? (process.env['ANTHROPIC_API_KEY'] ?? '')
      : (process.env['VITE_GEMINI_API_KEY'] ?? process.env['GEMINI_API_KEY'] ?? '');

  return {
    ai: {
      provider,
      model: parsed.ai.model,
      max_tokens: parsed.ai.max_tokens,
    },
    prompts_dir: parsed.prompts_dir,
    profile_path: parsed.profile_path,
    apiKey,
  };
}
