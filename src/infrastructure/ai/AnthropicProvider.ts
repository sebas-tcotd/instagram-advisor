import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from '../../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';
import type { PostAnalysisResult, Verdict } from '../../domain/entities/PostAnalysisResult';
import type { CaptionResult } from '../../domain/entities/CaptionResult';
import type { AuditResult, ChecklistItem, Priority } from '../../domain/entities/AuditResult';
import type { AppConfig } from '../config/loadConfig';
import { assembleSystemPrompt } from './promptUtils';

const VALID_VERDICTS: readonly Verdict[] = ['listo', 'ajustar', 'no va'];

function validatePostAnalysisResult(parsed: unknown): PostAnalysisResult {
  const obj = parsed as Record<string, unknown>;
  if (
    !obj ||
    typeof obj['verdict'] !== 'string' ||
    typeof obj['analysis'] !== 'string' ||
    !Array.isArray(obj['suggestions']) ||
    !obj['scores'] ||
    typeof (obj['scores'] as Record<string, unknown>)['visual'] !== 'string' ||
    typeof (obj['scores'] as Record<string, unknown>)['caption'] !== 'string' ||
    typeof (obj['scores'] as Record<string, unknown>)['fit'] !== 'string'
  ) {
    throw new Error('Anthropic response missing required PostAnalysisResult fields');
  }
  if (!VALID_VERDICTS.includes(obj['verdict'] as Verdict)) {
    throw new Error(`Invalid verdict value: "${String(obj['verdict'])}". Expected one of: ${VALID_VERDICTS.join(', ')}`);
  }
  return parsed as PostAnalysisResult;
}

function validateCaptionResult(parsed: unknown): CaptionResult {
  const obj = parsed as Record<string, unknown>;
  if (!obj || !Array.isArray(obj['captions'])) {
    throw new Error('Anthropic response missing required CaptionResult fields');
  }
  for (const cap of obj['captions'] as unknown[]) {
    const c = cap as Record<string, unknown>;
    if (typeof c['tone'] !== 'string' || typeof c['hook_type'] !== 'string' || typeof c['text'] !== 'string') {
      throw new Error('Anthropic caption item missing required fields (tone, hook_type, text)');
    }
  }
  return parsed as CaptionResult;
}

const VALID_PRIORITIES: readonly Priority[] = ['urgente', 'importante', 'mejora'];

function validateAuditResult(parsed: unknown): AuditResult {
  const obj = parsed as Record<string, unknown>;
  if (
    !obj ||
    typeof obj['overall'] !== 'string' ||
    typeof obj['status'] !== 'string' ||
    !Array.isArray(obj['checklist'])
  ) {
    throw new Error('Anthropic response missing required AuditResult fields');
  }

  const overallStr = obj['overall'];
  const overallScore = parseInt(overallStr.split('/')[0], 10);
  if (isNaN(overallScore)) {
    throw new Error(`Cannot parse overallScore from "${overallStr}"`);
  }

  for (const item of obj['checklist'] as unknown[]) {
    const c = item as Record<string, unknown>;
    if (
      typeof c['element'] !== 'string' ||
      typeof c['issue'] !== 'string' ||
      typeof c['action'] !== 'string' ||
      !VALID_PRIORITIES.includes(c['priority'] as Priority)
    ) {
      throw new Error('Anthropic checklist item missing required fields (priority, element, issue, action)');
    }
  }

  return {
    overallScore,
    status: obj['status'],
    checklist: obj['checklist'] as ChecklistItem[],
    wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : [],
  };
}

function extractJSON(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\n?|```$/gm, '').trim();
  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    try {
      return JSON.parse(match ? match[0] : stripped) as unknown;
    } catch (err) {
      throw new Error(`Anthropic response is not valid JSON: ${String(err)}\nRaw: ${raw}`, { cause: err });
    }
  }
}

export class AnthropicProvider implements AIProvider {
  private readonly client: Anthropic;

  constructor(private readonly config: AppConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    const systemPrompt = assembleSystemPrompt('post-advisor.md', this.config);
    const userText = `Formato: ${req.format}\nCapa: ${req.layer}${req.caption ? `\nCaption propuesto: ${req.caption}` : ''}`;

    const response = await this.client.messages.create({
      model: this.config.ai.model,
      max_tokens: this.config.ai.max_tokens,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.imageBase64 } },
          { type: 'text', text: userText },
        ],
      }],
    });

    const raw = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    const parsed = extractJSON(raw);
    return validatePostAnalysisResult(parsed);
  }

  async generateCaption(req: CaptionRequest): Promise<CaptionResult> {
    const systemPrompt = assembleSystemPrompt('caption-generator.md', this.config);
    const userText = `Tono: ${req.tone}`;

    const response = await this.client.messages.create({
      model: this.config.ai.model,
      max_tokens: this.config.ai.max_tokens,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.imageBase64 } },
          { type: 'text', text: userText },
        ],
      }],
    });

    const raw = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    const parsed = extractJSON(raw);
    return validateCaptionResult(parsed);
  }

  async auditProfile(profileYaml: string): Promise<AuditResult> {
    const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config);

    const response = await this.client.messages.create({
      model: this.config.ai.model,
      max_tokens: this.config.ai.max_tokens,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: profileYaml }],
      }],
    });

    const raw = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
    const parsed = extractJSON(raw);
    return validateAuditResult(parsed);
  }
}
