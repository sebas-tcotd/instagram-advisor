import type { AIProvider } from '../../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../../domain/entities/AnalyzeRequest';
import type { CaptionRequest } from '../../domain/entities/CaptionRequest';
import type { PostAnalysisResult, Verdict } from '../../domain/entities/PostAnalysisResult';
import type { CaptionResult } from '../../domain/entities/CaptionResult';
import type { AuditResult, ChecklistItem, Priority } from '../../domain/entities/AuditResult';
import type { AppConfig } from '../config/loadConfig';
import { assembleSystemPrompt } from './promptUtils';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

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
    throw new Error('Gemini response missing required PostAnalysisResult fields');
  }
  if (!VALID_VERDICTS.includes(obj['verdict'] as Verdict)) {
    throw new Error(`Invalid verdict value: "${String(obj['verdict'])}". Expected one of: ${VALID_VERDICTS.join(', ')}`);
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
  maxTokens: number,
): Promise<unknown> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens },
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

async function callGeminiText(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  maxTokens: number,
): Promise<unknown> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens },
    contents: [{
      role: 'user',
      parts: [
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

const VALID_PRIORITIES: readonly Priority[] = ['urgente', 'importante', 'mejora'];

function validateAuditResult(parsed: unknown): AuditResult {
  const obj = parsed as Record<string, unknown>;
  if (
    !obj ||
    typeof obj['overall'] !== 'string' ||
    typeof obj['status'] !== 'string' ||
    !Array.isArray(obj['checklist'])
  ) {
    throw new Error('Gemini response missing required AuditResult fields');
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
      throw new Error('Gemini checklist item missing required fields (priority, element, issue, action)');
    }
  }

  return {
    overallScore,
    status: obj['status'],
    checklist: obj['checklist'] as ChecklistItem[],
    wins: Array.isArray(obj['wins']) ? (obj['wins'] as string[]) : [],
  };
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
      this.config.ai.max_tokens,
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
      this.config.ai.max_tokens,
    );
    return validateCaptionResult(parsed);
  }

  async auditProfile(profileYaml: string): Promise<AuditResult> {
    const systemPrompt = assembleSystemPrompt('profile-auditor.md', this.config);
    const parsed = await callGeminiText(
      this.config.apiKey,
      this.config.ai.model,
      systemPrompt,
      profileYaml,
      this.config.ai.max_tokens,
    );
    return validateAuditResult(parsed);
  }
}
