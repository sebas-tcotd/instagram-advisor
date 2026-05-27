import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIProvider } from '../domain/ports/AIProvider';
import type { CaptionRequest } from '../domain/entities/CaptionRequest';
import type { CaptionResult } from '../domain/entities/CaptionResult';
import { GenerateCaption } from './GenerateCaption';

const makeProvider = (): AIProvider => ({
  analyzePost: vi.fn(),
  generateCaption: vi.fn(),
  auditProfile: vi.fn(),
});

const makeRequest = (): CaptionRequest => ({
  imageBase64: 'base64data',
  mimeType: 'image/jpeg',
  tone: 'narrativo',
});

const makeResult = (): CaptionResult => ({
  captions: [
    { tone: 'narrativo', hook_type: 'pregunta', text: 'Caption text here' },
  ],
  notes: 'Keep it concise',
});

describe('GenerateCaption', () => {
  let provider: AIProvider;
  let useCase: GenerateCaption;

  beforeEach(() => {
    provider = makeProvider();
    useCase = new GenerateCaption(provider);
  });

  it('calls provider.generateCaption exactly once with the request object', async () => {
    const req = makeRequest();
    const result = makeResult();
    vi.mocked(provider.generateCaption).mockResolvedValueOnce(result);

    await useCase.execute(req);

    expect(provider.generateCaption).toHaveBeenCalledTimes(1);
    expect(provider.generateCaption).toHaveBeenCalledWith(req);
  });

  it('returns the resolved value from provider.generateCaption', async () => {
    const req = makeRequest();
    const result = makeResult();
    vi.mocked(provider.generateCaption).mockResolvedValueOnce(result);

    const returned = await useCase.execute(req);

    expect(returned).toBe(result);
  });

  it('propagates errors thrown by provider.generateCaption', async () => {
    const req = makeRequest();
    const error = new Error('Caption provider failure');
    vi.mocked(provider.generateCaption).mockRejectedValueOnce(error);

    await expect(useCase.execute(req)).rejects.toThrow('Caption provider failure');
  });
});
