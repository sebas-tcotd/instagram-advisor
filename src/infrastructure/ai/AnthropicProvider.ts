import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { AIProvider } from '../../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';
import type { PostAnalysisResult } from '../../domain/entities/PostAnalysisResult';
import type { CaptionResult } from '../../domain/entities/CaptionResult';
import type { AuditResult } from '../../domain/entities/AuditResult';
import type { AppConfig } from '../config/loadConfig';

function assembleSystemPrompt(promptFile: string, config: AppConfig): string {
  const promptsDir = resolve(process.cwd(), config.prompts_dir);
  const agentPrompt = readFileSync(resolve(promptsDir, promptFile), 'utf8');
  const strategy = readFileSync(resolve(promptsDir, 'strategy.md'), 'utf8');
  const profile = readFileSync(resolve(process.cwd(), config.profile_path), 'utf8');
  return `${agentPrompt}\n\n---\n\n## Estrategia completa\n\n${strategy}\n\n## Perfil\n\n${profile}`;
}

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

function extractJSON(raw: string): unknown {
  const match = raw.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : raw) as unknown;
  } catch (err) {
    throw new Error(`Anthropic response is not valid JSON: ${String(err)}\nRaw: ${raw}`);
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

  async auditProfile(_profileYaml: string): Promise<AuditResult> {
    throw new Error('AuditProfile not implemented — Phase 2');
  }
}
