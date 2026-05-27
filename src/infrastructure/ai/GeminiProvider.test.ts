import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiProvider } from './GeminiProvider';
import type { AppConfig } from '../config/loadConfig';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';

// Mock fs to avoid real file reads
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mock-file-content'),
}));

const makeConfig = (): AppConfig => ({
  ai: { provider: 'gemini', model: 'gemini-2.0-flash', max_tokens: 1024 },
  prompts_dir: './prompts',
  profile_path: './profile.yaml',
  apiKey: 'test-api-key',
});

const makeAnalyzeReq = (): AnalyzeRequest => ({
  imageBase64: 'base64imagedata',
  mimeType: 'image/jpeg',
  format: 'post_individual',
  layer: 'externa',
});

const makeCaptionReq = (): CaptionRequest => ({
  imageBase64: 'base64imagedata',
  mimeType: 'image/jpeg',
  tone: 'narrativo',
});

const makeGeminiResponse = (jsonBody: string) => ({
  ok: true,
  json: async () => ({
    candidates: [{
      content: {
        parts: [{ text: jsonBody }],
      },
    }],
  }),
});

const makeErrorResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: async () => ({ error: { message: `Error ${status}` } }),
});

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new GeminiProvider(makeConfig());
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('analyzePost', () => {
    it('returns PostAnalysisResult when Gemini returns valid JSON', async () => {
      const validResult = {
        verdict: 'listo',
        scores: { visual: '9/10', caption: '8/10', fit: '9/10' },
        analysis: 'Great photo composition',
        suggestions: ['Keep the same style'],
      };
      fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(validResult)));

      const result = await provider.analyzePost(makeAnalyzeReq());

      expect(result.verdict).toBe('listo');
      expect(result.scores.visual).toBe('9/10');
      expect(result.analysis).toBe('Great photo composition');
      expect(result.suggestions).toHaveLength(1);
    });

    it('throws Error when Gemini returns JSON missing required fields', async () => {
      const invalidResult = { verdict: 'listo' }; // missing scores, analysis, suggestions
      fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(invalidResult)));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'missing required PostAnalysisResult fields',
      );
    });

    it('throws Error with status when HTTP response is not OK', async () => {
      fetchSpy.mockResolvedValue(makeErrorResponse(401, 'Unauthorized'));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'Gemini API 401',
      );
    });

    it('validates that scores object has all three fields', async () => {
      const missingScoreField = {
        verdict: 'listo',
        scores: { visual: '9/10', caption: '8/10' }, // missing fit
        analysis: 'Good photo',
        suggestions: ['Tip one'],
      };
      fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(missingScoreField)));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'missing required PostAnalysisResult fields',
      );
    });
  });

  describe('generateCaption', () => {
    it('returns CaptionResult when Gemini returns valid caption array', async () => {
      const validResult = {
        captions: [
          { tone: 'narrativo', hook_type: 'pregunta', text: 'Caption text here' },
          { tone: 'introspectivo', hook_type: 'declaracion', text: 'Another caption' },
        ],
      };
      fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(validResult)));

      const result = await provider.generateCaption(makeCaptionReq());

      expect(result.captions).toHaveLength(2);
      expect(result.captions[0].tone).toBe('narrativo');
      expect(result.captions[0].hook_type).toBe('pregunta');
    });

    it('throws Error when caption item is missing required fields', async () => {
      const invalidResult = {
        captions: [
          { tone: 'narrativo', text: 'Caption text' }, // missing hook_type
        ],
      };
      fetchSpy.mockResolvedValue(makeGeminiResponse(JSON.stringify(invalidResult)));

      await expect(provider.generateCaption(makeCaptionReq())).rejects.toThrow(
        'missing required fields',
      );
    });
  });

  describe('auditProfile', () => {
    it('throws Error with Phase 2 message', async () => {
      await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
        'Phase 2',
      );
    });
  });
});
