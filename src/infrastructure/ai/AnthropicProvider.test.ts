import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from './AnthropicProvider';
import type { AppConfig } from '../config/loadConfig';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';

// Mock fs to avoid real file reads
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('mock-file-content'),
}));

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  }),
}));

const makeConfig = (): AppConfig => ({
  ai: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', max_tokens: 1024 },
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

const makeAnthropicResponse = (jsonBody: string) => ({
  content: [{ type: 'text', text: jsonBody }],
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AnthropicProvider(makeConfig());
  });

  describe('analyzePost', () => {
    it('returns PostAnalysisResult when Anthropic returns valid JSON', async () => {
      const validResult = {
        verdict: 'ajustar',
        scores: { visual: '7/10', caption: '6/10', fit: '8/10' },
        analysis: 'Good but needs work',
        suggestions: ['Improve lighting', 'Add caption'],
      };
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validResult)));

      const result = await provider.analyzePost(makeAnalyzeReq());

      expect(result.verdict).toBe('ajustar');
      expect(result.scores.visual).toBe('7/10');
      expect(result.suggestions).toHaveLength(2);
    });

    it('throws Error when Anthropic returns JSON missing required fields', async () => {
      const invalidResult = { verdict: 'listo', analysis: 'Good' }; // missing scores, suggestions
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(invalidResult)));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'missing required PostAnalysisResult fields',
      );
    });

    it('throws Error (not process.exit) when SDK throws', async () => {
      mockCreate.mockRejectedValue(new Error('API connection failed'));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'API connection failed',
      );
    });

    it('throws Error when response is not valid JSON', async () => {
      mockCreate.mockResolvedValue(makeAnthropicResponse('this is not json at all'));

      await expect(provider.analyzePost(makeAnalyzeReq())).rejects.toThrow(
        'not valid JSON',
      );
    });
  });

  describe('generateCaption', () => {
    it('returns CaptionResult when Anthropic returns valid caption array', async () => {
      const validResult = {
        captions: [
          { tone: 'narrativo', hook_type: 'pregunta', text: 'Caption uno' },
          { tone: 'sensorial', hook_type: 'escena', text: 'Caption dos' },
        ],
        notes: 'These are optimized for Instagram',
      };
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validResult)));

      const result = await provider.generateCaption(makeCaptionReq());

      expect(result.captions).toHaveLength(2);
      expect(result.captions[0].text).toBe('Caption uno');
      expect(result.notes).toBe('These are optimized for Instagram');
    });

    it('uses config.ai.model and config.ai.max_tokens (not hardcoded)', async () => {
      const validResult = {
        captions: [{ tone: 'narrativo', hook_type: 'pregunta', text: 'Caption' }],
      };
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validResult)));

      await provider.generateCaption(makeCaptionReq());

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
        }),
      );
    });
  });

  describe('auditProfile', () => {
    const validAuditResult = {
      overall: '7/10',
      status: 'El perfil tiene identidad visual clara pero la bio es débil.',
      checklist: [
        {
          priority: 'urgente',
          element: 'Bio',
          issue: 'No responde qué haces ni desde dónde',
          action: 'Reescribir con estructura identidad/ubicación/credencial',
        },
      ],
      wins: ['Feed B&N consistente'],
    };

    it('returns AuditResult with parsed overallScore when Anthropic returns valid JSON', async () => {
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validAuditResult)));

      const result = await provider.auditProfile('profile yaml content');

      expect(result.overallScore).toBe(7);
      expect(typeof result.status).toBe('string');
      expect(result.checklist[0].priority).toBe('urgente');
      expect(result.wins?.[0]).toBe('Feed B&N consistente');
    });

    it('throws error containing "missing required AuditResult fields" when status/checklist missing', async () => {
      const invalid = { overall: '7/10' }; // missing status and checklist
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(invalid)));

      await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
        'missing required AuditResult fields',
      );
    });

    it('throws error containing "checklist item missing required fields" when priority is invalid', async () => {
      const invalidPriority = {
        ...validAuditResult,
        checklist: [{ priority: 'critico', element: 'Bio', issue: 'bad', action: 'fix' }],
      };
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(invalidPriority)));

      await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
        'checklist item missing required fields',
      );
    });

    it('throws error containing "Cannot parse overallScore" when overall is unparseable', async () => {
      const unparseable = { ...validAuditResult, overall: 'siete' };
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(unparseable)));

      await expect(provider.auditProfile('profile yaml')).rejects.toThrow(
        'Cannot parse overallScore',
      );
    });

    it('sends text-only content — no image block in messages', async () => {
      mockCreate.mockResolvedValue(makeAnthropicResponse(JSON.stringify(validAuditResult)));

      await provider.auditProfile('profile yaml content');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: [{ type: 'text', text: 'profile yaml content' }],
            }),
          ]),
        }),
      );
    });
  });
});
