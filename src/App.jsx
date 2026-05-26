import { useState, useRef, useCallback } from 'react'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY
console.log({API_KEY, envs: import.meta.env})
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const STRATEGY = `Eres el Post Advisor de @sebas_tcotd. Analiza posts candidatos para Instagram con base en la estrategia personal de Sebastián Vargas Pizango.

PERFIL: Fotógrafo, escritor (autor de Sentimientos 2021) y software engineer frontend limeño. Introvertido, voz auténtica en español, raíces peruanas visibles.

ESTRATEGIA VISUAL: Feed B&N como firma absoluta. Única excepción: color de acento deliberado (naranja/dorado del libro sobre fondo oscuro). Rupturas prohibidas: fotos a color sin intención, imágenes de IA sin firma visual propia.

DOS CAPAS: Externa (engancha): fotografía B&N, escritura poética, autor publicado, engineer. Interna (retiene): proceso creativo, japonés, bajo, Cities Skylines, archivo fotográfico familiar, universo Beirou.

FÓRMULA CAPTION: 1) Hook fuerte primera línea 2) Contexto dónde/cuándo/qué 3) Conflicto interno 4) Imagen como resolución o pregunta 5) Pregunta genuina al cierre.

TONO: Español principal. Honesto y preciso. Vulnerable sin ser lloroso. Poético sin ser pretencioso. Sin jerga de Instagram.

Responde SOLO con JSON válido sin texto adicional:
{"verdict":"listo|ajustar|no va","scores":{"visual":"X/10","caption":"X/10","fit":"X/10"},"analysis":"texto aquí — máx 280 palabras, directo, menciona qué funciona antes de qué falla","suggestions":["sugerencia 1","sugerencia 2"]}`

const CAPTION_PROMPT = `Eres el generador de captions de @sebas_tcotd. Escribe borradores que suenen exactamente como Sebas.

VOZ: Español principal. Honesto y preciso. Vulnerable sin ser lloroso. Poético sin ser pretencioso. Con raíces limeñas visibles. Sin jerga de Instagram, sin frases motivacionales.

ESTRUCTURA: Hook fuerte → Contexto (dónde/cuándo/qué) → Conflicto interno → Resolución o pregunta abierta → Pregunta genuina al cierre. 80–150 palabras.

HOOKS DISPONIBLES: temporal ("Escribí esto cuando tenía 17 años"), contraste ("La foto que más me costó tomar no fue esta"), sensorial ("Lima a las 3am suena así:"), verdad incómoda, tensión, observación pura.

Responde SOLO con JSON válido:
{"captions":[{"tone":"nombre","hook_type":"tipo","text":"caption completo"},{"tone":"nombre","hook_type":"tipo","text":"caption alternativo"}],"notes":"recomendación en 1-2 líneas"}`

const TONES = ['narrativo', 'introspectivo', 'sensorial', 'proceso', 'tensión']
const FORMATS = [
  { value: 'post_individual', label: 'Post individual' },
  { value: 'carrusel',        label: 'Carrusel (slide 1)' },
  { value: 'historia',        label: 'Historia' },
  { value: 'reel',            label: 'Reel (thumbnail)' },
]
const LAYERS = [
  { value: 'externa',   label: 'Externa — B&N / escritura' },
  { value: 'interna',   label: 'Interna — proceso / lore' },
  { value: 'engineer',  label: 'Engineer / Figma / tech' },
]

function VerdictBadge({ verdict }) {
  const map = {
    'listo':   { label: '✓ listo para publicar', color: 'var(--green)',      bg: 'var(--green-bg)' },
    'ajustar': { label: '⚠ necesita ajustes',    color: 'var(--yellow)',     bg: 'var(--yellow-bg)' },
    'no va':   { label: '✕ no va al feed',        color: 'var(--red)',        bg: 'var(--red-bg)' },
  }
  const v = map[verdict] || map['ajustar']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}

function ScoreBar({ label, score }) {
  const [num] = score.split('/')
  const pct = (parseInt(num) / 10) * 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: 11 }}>
        <span>{label}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{score}</span>
      </div>
      <div style={{ height: 2, background: 'var(--bg-3)', borderRadius: 1 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 1,
          background: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)',
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: '1.5px solid var(--border-md)',
      borderTopColor: 'var(--text-2)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

export default function App() {
  const [tab, setTab]           = useState('analyze')
  const [image, setImage]       = useState(null)     // { base64, type, url }
  const [caption, setCaption]   = useState('')
  const [format, setFormat]     = useState('post_individual')
  const [layer, setLayer]       = useState('externa')
  const [tone, setTone]         = useState('narrativo')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const fileRef = useRef()

  const loadImage = (file) => {
    if (!file) return

    const fileType = file.type || ''
    if (!fileType.startsWith('image/')) {
      setImage(null)
      setResult(null)
      setError('Selecciona una imagen válida (jpg, png o webp).')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setImage({ base64: dataUrl.split(',')[1], type: fileType, url: dataUrl })
      setResult(null)
      setError(null)
    }
    reader.onerror = () => {
      setImage(null)
      setResult(null)
      setError('No se pudo leer la imagen. Intenta con otra.')
    }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    loadImage(e.dataTransfer.files[0])
  }, [])

  const callAPI = async (systemPrompt, userText) => {
    if (!API_KEY) {
      throw new Error('No se encontró ninguna API key válida en el .env (se intentó VITE_GEMINI_API_KEY y VITE_ANTHROPIC_API_KEY).')
    }

    if (!image?.base64 || !image?.type) {
      throw new Error('No hay una imagen cargada para enviar a Gemini.')
    }

    const body = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: image.type,
                data: image.base64,
              },
            },
            { text: userText },
          ],
        },
      ],
    }

    const res = await fetch(`${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      let detail = res.statusText
      try {
        const err = await res.json()
        detail = err.error?.message || JSON.stringify(err)
      } catch {
        // fallback to statusText
      }
      throw new Error(`Gemini API ${res.status}: ${detail}`)
    }

    const data = await res.json()

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
      return JSON.parse(jsonString)
    } catch (error) {
      throw new Error(`La respuesta de Gemini no es JSON válido. ${error.message}`)
    }
  }

  const runAnalyze = async () => {
    if (!image) return
    setLoading(true); setResult(null); setError(null)
    try {
      const userText = `Analiza este post candidato para @sebas_tcotd.
Formato: ${format} · Capa: ${layer}
${caption ? `Caption: "${caption}"` : 'Sin caption — evalúa desde la imagen y sugiere ángulo narrativo.'}`
      const parsed = await callAPI(STRATEGY, userText)
      setResult({ type: 'analyze', data: parsed })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const runCaption = async () => {
    if (!image) return
    setLoading(true); setResult(null); setError(null)
    try {
      const userText = `Genera captions para esta foto de @sebas_tcotd. Tono preferido: ${tone}. Genera 2 versiones con tonos distintos. Responde solo con el JSON.`
      const parsed = await callAPI(CAPTION_PROMPT, userText)
      setResult({ type: 'caption', data: parsed })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const s = {
    root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
    header: {
      borderBottom: '1px solid var(--border)', padding: '18px 32px',
      display: 'flex', alignItems: 'baseline', gap: 16,
    },
    title: { fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.02em' },
    handle: { fontSize: 11, color: 'var(--accent)', letterSpacing: '0.04em' },
    body: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
    panel: { padding: '28px 32px', borderRight: '1px solid var(--border)' },
    right: { padding: '28px 32px' },
    tabs: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' },
    tab: (active) => ({
      padding: '6px 16px 10px', fontSize: 11, letterSpacing: '0.06em',
      background: 'transparent', border: 'none', borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', marginBottom: -1,
    }),
    dropzone: (drag) => ({
      border: `1px dashed ${drag ? 'var(--accent)' : 'var(--border-md)'}`,
      borderRadius: 'var(--radius-lg)', padding: '32px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
      background: drag ? 'rgba(212,124,47,0.04)' : 'transparent',
      color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em',
    }),
    preview: { width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 'var(--radius)', display: 'block' },
    label: { fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '8px 12px', background: 'var(--bg-2)', lineHeight: 1.6 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    toneRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
    chip: (active) => ({
      padding: '4px 10px', fontSize: 11, borderRadius: 'var(--radius)',
      border: `1px solid ${active ? 'var(--accent-dim)' : 'var(--border)'}`,
      color: active ? 'var(--accent)' : 'var(--text-3)',
      background: active ? 'rgba(212,124,47,0.06)' : 'transparent',
      cursor: 'pointer', transition: 'all 0.12s',
    }),
    runBtn: {
      width: '100%', padding: '10px', fontSize: 11, letterSpacing: '0.08em',
      borderColor: 'var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    section: { marginBottom: 20 },
    divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' },
    verdictRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    scoresGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
    analysis: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' },
    suggestions: { marginTop: 14 },
    suggestionItem: {
      padding: '8px 12px', marginBottom: 6,
      background: 'var(--bg-2)', borderRadius: 'var(--radius)',
      borderLeft: '2px solid var(--accent-dim)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
    },
    captionCard: {
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 12,
    },
    captionMeta: { display: 'flex', gap: 8, marginBottom: 10 },
    pill: { fontSize: 10, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 'var(--radius)', background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' },
    captionText: { fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' },
    notes: { fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' },
    empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em' },
    errBox: { background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 },
  }

  return (
    <div style={s.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={s.header}>
        <span style={s.title}>instagram-advisor</span>
        <span style={s.handle}>@sebas_tcotd</span>
      </header>

      <div style={s.body}>
        {/* LEFT PANEL — input */}
        <div style={s.panel}>
          <div style={s.tabs}>
            {[['analyze', 'analizar post'], ['caption', 'generar caption']].map(([val, lbl]) => (
              <button key={val} style={s.tab(tab === val)} onClick={() => { setTab(val); setResult(null); setError(null) }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* dropzone */}
          <div style={s.section}>
            {image ? (
              <div style={{ position: 'relative' }}>
                <img src={image.url} alt="Foto candidata" style={s.preview} />
                <button
                  onClick={() => { setImage(null); setResult(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', fontSize: 10, letterSpacing: '0.06em' }}>
                  cambiar
                </button>
              </div>
            ) : (
              <div
                style={s.dropzone(dragging)}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}
              >
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }}
                  onChange={(e) => loadImage(e.target.files[0])} />
                <span style={{ fontSize: 22 }}>↑</span>
                <span>arrastra o haz clic para subir</span>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>jpg · png · webp</span>
              </div>
            )}
          </div>

          {tab === 'analyze' && (
            <>
              <div style={s.section}>
                <label style={s.label}>caption (opcional)</label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Escribe el caption aquí, o déjalo vacío para analizar solo la imagen..."
                  style={{ ...s.input, minHeight: 88 }}
                />
              </div>
              <div style={{ ...s.row2, ...s.section }}>
                <div>
                  <label style={s.label}>formato</label>
                  <select value={format} onChange={e => setFormat(e.target.value)} style={s.input}>
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>capa</label>
                  <select value={layer} onChange={e => setLayer(e.target.value)} style={s.input}>
                    {LAYERS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <button style={s.runBtn} disabled={!image || loading} onClick={runAnalyze}>
                {loading ? <><Spinner /> analizando...</> : '→ analizar'}
              </button>
            </>
          )}

          {tab === 'caption' && (
            <>
              <div style={s.section}>
                <label style={s.label}>tono preferido</label>
                <div style={s.toneRow}>
                  {TONES.map(t => (
                    <button key={t} style={s.chip(tone === t)} onClick={() => setTone(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <button style={{ ...s.runBtn, marginTop: 8 }} disabled={!image || loading} onClick={runCaption}>
                {loading ? <><Spinner /> generando...</> : '→ generar captions'}
              </button>
            </>
          )}
        </div>

        {/* RIGHT PANEL — output */}
        <div style={s.right}>
          {error && (
            <div style={s.errBox}>
              <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 4, fontSize: 11, letterSpacing: '0.06em' }}>ERROR</strong>
              {error}
            </div>
          )}

          {!result && !error && !loading && (
            <div style={s.empty}>
              <span style={{ fontSize: 28, opacity: 0.2 }}>◎</span>
              <span>sube una foto para comenzar</span>
            </div>
          )}

          {loading && (
            <div style={s.empty}>
              <Spinner />
              <span style={{ marginTop: 8 }}>{tab === 'analyze' ? 'analizando post...' : 'generando captions...'}</span>
            </div>
          )}

          {result?.type === 'analyze' && (() => {
            const { verdict, scores, analysis, suggestions } = result.data
            return (
              <>
                <div style={s.verdictRow}>
                  <VerdictBadge verdict={verdict} />
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>post-advisor</span>
                </div>
                <hr style={s.divider} />
                <div style={s.scoresGrid}>
                  <ScoreBar label="visual" score={scores.visual} />
                  <ScoreBar label="caption" score={scores.caption} />
                  <ScoreBar label="fit" score={scores.fit} />
                </div>
                <hr style={s.divider} />
                <p style={s.analysis}>{analysis}</p>
                {suggestions?.length > 0 && (
                  <div style={s.suggestions}>
                    {suggestions.map((s_, i) => (
                      <div key={i} style={s.suggestionItem}>{s_}</div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          {result?.type === 'caption' && (() => {
            const { captions, notes } = result.data
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.04em' }}>2 versiones generadas</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>caption-generator</span>
                </div>
                {captions?.map((c, i) => (
                  <div key={i} style={s.captionCard}>
                    <div style={s.captionMeta}>
                      <span style={s.pill}>{c.tone}</span>
                      <span style={s.pill}>{c.hook_type}</span>
                    </div>
                    <p style={s.captionText}>{c.text}</p>
                  </div>
                ))}
                {notes && <p style={s.notes}>{notes}</p>}
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
