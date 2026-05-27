import { describe, it, expect, vi } from 'vitest';
import type { AIProvider } from '../domain/ports/AIProvider';
import type { CaptionRequest } from '../domain/entities/CaptionRequest';
import type { CaptionResult } from '../domain/entities/CaptionResult';
import { GenerateCaption } from './GenerateCaption';

const makeProvider = (): AIProvider => ({
  analyzePost: vi.fn(),
  generateCaption: vi.fn(),
  auditProfile: vi.fn(),
});

const mockRequest: CaptionRequest = {
  imageBase64: 'xyz789',
  mimeType: 'image/png',
  tone: 'narrativo',
};

const mockResult: CaptionResult = {
  captions: [
    { tone: 'narrativo', hook_type: 'question', text: 'Caption one text.' },
    { tone: 'introspectivo', hook_type: 'statement', text: 'Caption two text.' },
  ],
  notes: 'Both captions work well.',
};

describe('GenerateCaption', () => {
  it('calls provider.generateCaption exactly once with the request object', async () => {
    const provider = makeProvider();
    vi.mocked(provider.generateCaption).mockResolvedValue(mockResult);

    const useCase = new GenerateCaption(provider);
    await useCase.execute(mockRequest);

    expect(provider.generateCaption).toHaveBeenCalledTimes(1);
    expect(provider.generateCaption).toHaveBeenCalledWith(mockRequest);
  });

  it('returns the resolved value from provider.generateCaption', async () => {
    const provider = makeProvider();
    vi.mocked(provider.generateCaption).mockResolvedValue(mockResult);

    const useCase = new GenerateCaption(provider);
    const result = await useCase.execute(mockRequest);

    expect(result).toBe(mockResult);
  });

  it('propagates errors thrown by provider.generateCaption', async () => {
    const provider = makeProvider();
    const error = new Error('Caption provider failure');
    vi.mocked(provider.generateCaption).mockRejectedValue(error);

    const useCase = new GenerateCaption(provider);

    await expect(useCase.execute(mockRequest)).rejects.toThrow('Caption provider failure');
  });
});
