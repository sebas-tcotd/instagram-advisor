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

  if (!parsed?.ai?.model || typeof parsed.ai.model !== 'string') {
    throw new Error('config.yaml: ai.model must be a non-empty string');
  }

  // Warn (not throw) when model name is not in the known allowlist — allows pre-release names.
  // Update these lists when new stable models are released.
  const KNOWN_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-3.5-flash'];
  const KNOWN_ANTHROPIC_MODELS = ['claude-3-5-sonnet-20241022', 'claude-sonnet-4-20250514'];
  const knownModels = parsed.ai.provider === 'anthropic' ? KNOWN_ANTHROPIC_MODELS : KNOWN_GEMINI_MODELS;
  if (!knownModels.includes(parsed.ai.model)) {
    console.warn(`[loadConfig] Warning: ai.model "${parsed.ai.model}" is not in the known model list. Check config.yaml if API calls return 404.`);
  }

  if (typeof parsed?.ai?.max_tokens !== 'number') {
    throw new Error('config.yaml: ai.max_tokens must be a number');
  }
  if (!parsed?.prompts_dir || !parsed?.profile_path) {
    throw new Error('config.yaml: prompts_dir and profile_path are required');
  }

  const apiKey =
    provider === 'anthropic'
      ? (process.env['ANTHROPIC_API_KEY'] ?? '')
      : (process.env['VITE_GEMINI_API_KEY'] ?? process.env['GEMINI_API_KEY'] ?? '');

  if (!apiKey) {
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY / VITE_GEMINI_API_KEY';
    throw new Error(`Missing required env var: ${envVar}. Set it in your .env file.`);
  }

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
