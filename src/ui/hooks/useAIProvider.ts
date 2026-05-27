import { useState } from 'react'
import postAdvisorPrompt from '@prompts/post-advisor.md?raw'
import captionPrompt from '@prompts/caption-generator.md?raw'
import strategyPrompt from '@prompts/strategy.md?raw'
import profileRaw from '@root/profile.yaml?raw'
import configRaw from '@root/config.yaml?raw'

import type { PostAnalysisResult } from '../../domain/entities/PostAnalysisResult'
import type { CaptionResult } from '../../domain/entities/CaptionResult'

// Detect model from config.yaml at Vite build time
const model = configRaw.match(/model:\s*(\S+)/)?.[1] ?? 'gemini-2.0-flash'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)
  || (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)

// TODO: Only Gemini REST API is supported in the browser UI for v1.
// AnthropicProvider requires a Node.js environment (CORS + server-side API key);
// browser support is out of scope until a backend proxy is added in v2.

function buildSystemPrompt(agentPrompt: string): string {
  return `${agentPrompt}\n\n---\n\n## Estrategia completa\n\n${strategyPrompt}\n\n## Perfil\n\n${profileRaw}`
}

async function callGemini(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string,
  userText: string
): Promise<unknown> {
  if (!API_KEY) {
    throw new Error('No se encontró ninguna API key válida en el .env (se intentó VITE_GEMINI_API_KEY y VITE_ANTHROPIC_API_KEY).')
  }

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: userText },
        ],
      },
    ],
  }

  const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const err = await res.json() as { error?: { message?: string } }
      detail = err.error?.message ?? JSON.stringify(err)
    } catch {
      // fallback to statusText
    }
    throw new Error(`Gemini API ${res.status}: ${detail}`)
  }

  const data = await res.json() as {
    promptFeedback?: { blockReason?: string }
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>
  }

  if (data?.promptFeedback?.blockReason) {
    throw new Error(`Gemini bloqueó la respuesta: ${data.promptFeedback.blockReason}`)
  }

  const responseText = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('')
    .trim()

  if (!responseText) {
    const finishReason = data?.candidates?.[0]?.finishReason
    throw new Error(
      finishReason
        ? `Gemini no devolvió texto (finishReason: ${finishReason}).`
        : 'Gemini no devolvió ningún texto.'
    )
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  const jsonString = jsonMatch ? jsonMatch[0] : responseText

  try {
    return JSON.parse(jsonString) as unknown
  } catch (err) {
    throw new Error(`La respuesta de Gemini no es JSON válido. ${(err as Error).message}`, { cause: err })
  }
}

export function useAnalyzePost() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PostAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    imageBase64: string,
    mimeType: string,
    format: string,
    layer: string,
    caption?: string
  ) => {
    setLoading(true); setResult(null); setError(null)
    try {
      const userText = `Analiza este post candidato para @sebas_tcotd.
Formato: ${format} · Capa: ${layer}
${caption ? `Caption: "${caption}"` : 'Sin caption — evalúa desde la imagen y sugiere ángulo narrativo.'}`
      const parsed = await callGemini(
        buildSystemPrompt(postAdvisorPrompt),
        imageBase64,
        mimeType,
        userText
      )
      setResult(parsed as PostAnalysisResult)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}

export function useGenerateCaption() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CaptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (imageBase64: string, mimeType: string, tone: string) => {
    setLoading(true); setResult(null); setError(null)
    try {
      const userText = `Genera captions para esta foto de @sebas_tcotd. Tono preferido: ${tone}. Genera 2 versiones con tonos distintos. Responde solo con el JSON.`
      const parsed = await callGemini(
        buildSystemPrompt(captionPrompt),
        imageBase64,
        mimeType,
        userText
      )
      setResult(parsed as CaptionResult)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { loading, result, error, run }
}
