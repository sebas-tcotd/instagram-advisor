import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing the module under test
vi.mock('../config/loadConfig', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('./GeminiProvider', () => {
  return {
    GeminiProvider: vi.fn().mockImplementation(function (this: Record<string, unknown>, config: unknown) {
      this['_config'] = config;
      this['analyzePost'] = vi.fn();
      this['generateCaption'] = vi.fn();
      this['auditProfile'] = vi.fn();
    }),
  };
});

vi.mock('./AnthropicProvider', () => {
  return {
    AnthropicProvider: vi.fn().mockImplementation(function (this: Record<string, unknown>, config: unknown) {
      this['_config'] = config;
      this['analyzePost'] = vi.fn();
      this['generateCaption'] = vi.fn();
      this['auditProfile'] = vi.fn();
    }),
  };
});

import { createAIProvider } from './AIProviderFactory';
import { loadConfig } from '../config/loadConfig';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';
import type { AppConfig } from '../config/loadConfig';

const mockLoadConfig = vi.mocked(loadConfig);

const makeConfig = (provider: 'gemini' | 'anthropic'): AppConfig => ({
  ai: { provider, model: 'test-model', max_tokens: 1024 },
  prompts_dir: './prompts',
  profile_path: './profile.yaml',
  apiKey: 'test-key',
});

describe('createAIProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a GeminiProvider instance when config.ai.provider is "gemini"', () => {
    mockLoadConfig.mockReturnValue(makeConfig('gemini'));

    const provider = createAIProvider();

    expect(GeminiProvider).toHaveBeenCalledOnce();
    expect(provider).toHaveProperty('analyzePost');
    expect(provider).toHaveProperty('generateCaption');
    expect(provider).toHaveProperty('auditProfile');
  });

  it('returns an AnthropicProvider instance when config.ai.provider is "anthropic"', () => {
    mockLoadConfig.mockReturnValue(makeConfig('anthropic'));

    const provider = createAIProvider();

    expect(AnthropicProvider).toHaveBeenCalledOnce();
    expect(provider).toHaveProperty('analyzePost');
    expect(provider).toHaveProperty('generateCaption');
    expect(provider).toHaveProperty('auditProfile');
  });

  it('passes the loaded config to the provider constructor', () => {
    const config = makeConfig('gemini');
    mockLoadConfig.mockReturnValue(config);

    createAIProvider();

    expect(GeminiProvider).toHaveBeenCalledWith(config);
  });

  it('forwards configPath to loadConfig when provided', () => {
    mockLoadConfig.mockReturnValue(makeConfig('anthropic'));

    createAIProvider('/custom/config.yaml');

    expect(mockLoadConfig).toHaveBeenCalledWith('/custom/config.yaml');
  });
});
