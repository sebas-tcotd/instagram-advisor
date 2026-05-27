import { loadConfig } from '../config/loadConfig';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';
import type { AIProvider } from '../../domain/ports/AIProvider';

/**
 * Reads config.yaml (via loadConfig) and returns the correct AIProvider
 * implementation. The application layer calls this factory without knowing
 * which provider is active — change config.yaml to switch providers.
 *
 * @param configPath - Optional path to config.yaml (defaults to CWD/config.yaml)
 */
export function createAIProvider(configPath?: string): AIProvider {
  const config = loadConfig(configPath);

  if (config.ai.provider === 'anthropic') {
    return new AnthropicProvider(config);
  }

  if (config.ai.provider === 'gemini') {
    return new GeminiProvider(config);
  }

  throw new Error(`Unknown provider: ${config.ai.provider}`);
}
