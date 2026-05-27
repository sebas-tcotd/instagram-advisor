import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { AIProvider } from '../../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';
import type { PostAnalysisResult } from '../../domain/entities/PostAnalysisResult';
import type { CaptionResult } from '../../domain/entities/CaptionResult';
import type { AuditResult } from '../../domain/entities/AuditResult';
import type { AppConfig } from '../config/loadConfig';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
    throw new Error('Gemini response missing required PostAnalysisResult fields');
  }
  return parsed as PostAnalysisResult;
}

function validateCaptionResult(parsed: unknown): CaptionResult {
  const obj = parsed as Record<string, unknown>;
  if (!obj || !Array.isArray(obj['captions'])) {
    throw new Error('Gemini response missing required CaptionResult fields');
  }
  for (const cap of obj['captions'] as unknown[]) {
    const c = cap as Record<string, unknown>;
    if (typeof c['tone'] !== 'string' || typeof c['hook_type'] !== 'string' || typeof c['text'] !== 'string') {
      throw new Error('Gemini caption item missing required fields (tone, hook_type, text)');
    }
  }
  return parsed as CaptionResult;
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userText: string,
): Promise<unknown> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: userText },
      ],
    }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json() as Record<string, unknown>;
      detail = (err['error'] as Record<string, unknown> | undefined)?.['message'] as string ?? JSON.stringify(err);
    } catch { /* use statusText */ }
    throw new Error(`Gemini API ${res.status}: ${detail}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const feedback = data['promptFeedback'] as Record<string, unknown> | undefined;
  if (feedback?.['blockReason']) {
    const reason = typeof feedback['blockReason'] === 'string' ? feedback['blockReason'] : JSON.stringify(feedback['blockReason']);
    throw new Error(`Gemini bloqueó la respuesta: ${reason}`);
  }

  const parts = (data['candidates'] as Record<string, unknown>[] | undefined)
    ?.[0]?.['content'] as Record<string, unknown> | undefined;
  const responseText = (parts?.['parts'] as Record<string, unknown>[] | undefined)
    ?.map((p) => p['text'])
    .filter(Boolean)
    .join('')
    .trim();

  if (!responseText) {
    throw new Error('Gemini returned an empty response');
  }

  const stripped = responseText.replace(/^```(?:json)?\n?|```$/gm, '').trim();
  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    try {
      return JSON.parse(match ? match[0] : stripped) as unknown;
    } catch (err) {
      throw new Error(`Gemini response is not valid JSON: ${String(err)}`, { cause: err });
    }
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private readonly config: AppConfig) {}

  async analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    const systemPrompt = assembleSystemPrompt('post-advisor.md', this.config);
    const userText = `Formato: ${req.format}\nCapa: ${req.layer}${req.caption ? `\nCaption propuesto: ${req.caption}` : ''}`;
    const parsed = await callGemini(
      this.config.apiKey,
      this.config.ai.model,
      systemPrompt,
      req.imageBase64,
      req.mimeType,
      userText,
    );
    return validatePostAnalysisResult(parsed);
  }

  async generateCaption(req: CaptionRequest): Promise<CaptionResult> {
    const systemPrompt = assembleSystemPrompt('caption-generator.md', this.config);
    const userText = `Tono: ${req.tone}`;
    const parsed = await callGemini(
      this.config.apiKey,
      this.config.ai.model,
      systemPrompt,
      req.imageBase64,
      req.mimeType,
      userText,
    );
    return validateCaptionResult(parsed);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  auditProfile(_profileYaml: string): Promise<AuditResult> {
    return Promise.reject(new Error('AuditProfile not implemented — Phase 2'));
  }
}
