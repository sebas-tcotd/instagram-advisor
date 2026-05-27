import { describe, it, expect, vi } from 'vitest';
import type { AIProvider } from '../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../domain/entities/AnalyzeRequest';
import type { PostAnalysisResult } from '../domain/entities/PostAnalysisResult';
import { AnalyzePost } from './AnalyzePost';

const makeProvider = (): AIProvider => ({
  analyzePost: vi.fn(),
  generateCaption: vi.fn(),
  auditProfile: vi.fn(),
});

const mockRequest: AnalyzeRequest = {
  imageBase64: 'abc123',
  mimeType: 'image/jpeg',
  format: 'post_individual',
  layer: 'externa',
};

const mockResult: PostAnalysisResult = {
  verdict: 'listo',
  scores: { visual: '8/10', caption: '7/10', fit: '9/10' },
  analysis: 'Great photo composition.',
  suggestions: ['Add more contrast', 'Adjust crop'],
};

describe('AnalyzePost', () => {
  it('calls provider.analyzePost exactly once with the request object', async () => {
    const provider = makeProvider();
    vi.mocked(provider).analyzePost.mockResolvedValue(mockResult);

    const useCase = new AnalyzePost(provider);
    await useCase.execute(mockRequest);

    expect(provider.analyzePost).toHaveBeenCalledTimes(1);
    expect(provider.analyzePost).toHaveBeenCalledWith(mockRequest);
  });

  it('returns the resolved value from provider.analyzePost', async () => {
    const provider = makeProvider();
    vi.mocked(provider).analyzePost.mockResolvedValue(mockResult);

    const useCase = new AnalyzePost(provider);
    const result = await useCase.execute(mockRequest);

    expect(result).toBe(mockResult);
  });

  it('propagates errors thrown by provider.analyzePost', async () => {
    const provider = makeProvider();
    const error = new Error('Provider failure');
    vi.mocked(provider).analyzePost.mockRejectedValue(error);

    const useCase = new AnalyzePost(provider);

    await expect(useCase.execute(mockRequest)).rejects.toThrow('Provider failure');
  });
});
