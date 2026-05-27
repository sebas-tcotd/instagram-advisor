import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AIProvider } from '../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../domain/entities/AnalyzeRequest';
import type { PostAnalysisResult } from '../domain/entities/PostAnalysisResult';
import { AnalyzePost } from './AnalyzePost';

const makeProvider = (): AIProvider => ({
  analyzePost: vi.fn(),
  generateCaption: vi.fn(),
  auditProfile: vi.fn(),
});

const makeRequest = (): AnalyzeRequest => ({
  imageBase64: 'base64data',
  mimeType: 'image/jpeg',
  format: 'post_individual',
  layer: 'externa',
});

const makeResult = (): PostAnalysisResult => ({
  verdict: 'listo',
  scores: { visual: '8/10', caption: '7/10', fit: '9/10' },
  analysis: 'Great post',
  suggestions: ['Use more contrast'],
});

describe('AnalyzePost', () => {
  let provider: AIProvider;
  let useCase: AnalyzePost;

  beforeEach(() => {
    provider = makeProvider();
    useCase = new AnalyzePost(provider);
  });

  it('calls provider.analyzePost exactly once with the request object', async () => {
    const req = makeRequest();
    const result = makeResult();
    vi.mocked(provider.analyzePost).mockResolvedValueOnce(result);

    await useCase.execute(req);

    expect(provider.analyzePost).toHaveBeenCalledTimes(1);
    expect(provider.analyzePost).toHaveBeenCalledWith(req);
  });

  it('returns the resolved value from provider.analyzePost', async () => {
    const req = makeRequest();
    const result = makeResult();
    vi.mocked(provider.analyzePost).mockResolvedValueOnce(result);

    const returned = await useCase.execute(req);

    expect(returned).toBe(result);
  });

  it('propagates errors thrown by provider.analyzePost', async () => {
    const req = makeRequest();
    const error = new Error('Provider failure');
    vi.mocked(provider.analyzePost).mockRejectedValueOnce(error);

    await expect(useCase.execute(req)).rejects.toThrow('Provider failure');
  });
});
