import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIProvider } from './AIProviderFactory';
import type { AppConfig } from '../config/loadConfig';

// Mock loadConfig to avoid filesystem access in unit tests
vi.mock('../config/loadConfig', () => ({
  loadConfig: vi.fn(),
}));

// Mock providers to avoid real API calls
vi.mock('./GeminiProvider', () => ({
  GeminiProvider: vi.fn().mockImplementation((config: AppConfig) => ({
    _config: config,
    analyzePost: vi.fn(),
    generateCaption: vi.fn(),
    auditProfile: vi.fn(),
  })),
}));

vi.mock('./AnthropicProvider', () => ({
  AnthropicProvider: vi.fn().mockImplementation((config: AppConfig) => ({
    _config: config,
    analyzePost: vi.fn(),
    generateCaption: vi.fn(),
    auditProfile: vi.fn(),
  })),
}));

import { loadConfig } from '../config/loadConfig';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';

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

  it('passes config to the provider constructor', () => {
    const config = makeConfig('gemini');
    mockLoadConfig.mockReturnValue(config);

    createAIProvider();

    expect(GeminiProvider).toHaveBeenCalledWith(config);
  });

  it('uses the configPath parameter when provided', () => {
    mockLoadConfig.mockReturnValue(makeConfig('anthropic'));

    createAIProvider('/custom/config.yaml');

    expect(mockLoadConfig).toHaveBeenCalledWith('/custom/config.yaml');
  });
});
