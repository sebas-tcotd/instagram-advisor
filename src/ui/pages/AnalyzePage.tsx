import { useState } from 'react'
import { useAnalyzePost } from '../hooks/useAIProvider'
import { VerdictBadge } from '../components/VerdictBadge'
import { ScoreBar } from '../components/ScoreBar'
import { Spinner } from '../components/Spinner'

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

interface ImageState { base64: string; type: string; url: string }

interface Props { image: ImageState | null }

const s = {
  section: { marginBottom: 20 },
  label: { fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '8px 12px', background: 'var(--bg-2)', lineHeight: 1.6 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  runBtn: {
    width: '100%', padding: '10px', fontSize: 11, letterSpacing: '0.08em',
    borderColor: 'var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' },
  verdictRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  scoresGrid: { display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 16 },
  analysis: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' as const },
  suggestions: { marginTop: 14 },
  suggestionItem: {
    padding: '8px 12px', marginBottom: 6,
    background: 'var(--bg-2)', borderRadius: 'var(--radius)',
    borderLeft: '2px solid var(--accent-dim)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
  },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em' },
  errBox: { background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 },
}

export function AnalyzePage({ image }: Props) {
  const [caption, setCaption] = useState('')
  const [format, setFormat] = useState('post_individual')
  const [layer, setLayer] = useState('externa')
  const { loading, result, error, run } = useAnalyzePost()

  const handleRun = () => {
    if (!image) return
    void run(image.base64, image.type, format, layer, caption || undefined)
  }

  return (
    <>
      {/* Analyze controls — left panel section */}
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
      <button style={s.runBtn} disabled={!image || loading} onClick={handleRun}>
        {loading ? <><Spinner /> analizando...</> : '→ analizar'}
      </button>

      {/* Results — right panel section */}
      {error && (
        <div style={{ ...s.section, marginTop: 20 }}>
          <div style={s.errBox}>
            <strong style={{ color: 'var(--red)', display: 'block', marginBottom: 4, fontSize: 11, letterSpacing: '0.06em' }}>ERROR</strong>
            {error}
          </div>
        </div>
      )}

      {loading && (
        <div style={s.empty}>
          <Spinner />
          <span style={{ marginTop: 8 }}>analizando post...</span>
        </div>
      )}

      {result && !loading && (
        <>
          <div style={s.verdictRow}>
            <VerdictBadge verdict={result.verdict} />
            <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>post-advisor</span>
          </div>
          <hr style={s.divider} />
          <div style={s.scoresGrid}>
            <ScoreBar label="visual" score={result.scores.visual} />
            <ScoreBar label="caption" score={result.scores.caption} />
            <ScoreBar label="fit" score={result.scores.fit} />
          </div>
          <hr style={s.divider} />
          <p style={s.analysis}>{result.analysis}</p>
          {result.suggestions?.length > 0 && (
            <div style={s.suggestions}>
              {result.suggestions.map((suggestion, i) => (
                <div key={i} style={s.suggestionItem}>{suggestion}</div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
