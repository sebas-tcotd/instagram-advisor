import { useState } from 'react'
import { useGenerateCaption } from '../hooks/useAIProvider'
import { Spinner } from '../components/Spinner'

const TONES = ['narrativo', 'introspectivo', 'sensorial', 'proceso', 'tensión']

interface ImageState { base64: string; type: string; url: string }

interface Props { image: ImageState | null }

const s = {
  section: { marginBottom: 20 },
  label: { fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' },
  toneRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  chip: (active: boolean) => ({
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
  captionCard: {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 12,
  },
  captionMeta: { display: 'flex', gap: 8, marginBottom: 10 },
  pill: { fontSize: 10, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 'var(--radius)', background: 'var(--bg-3)', color: 'var(--text-3)', border: '1px solid var(--border)' },
  captionText: { fontSize: 13, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' as const },
  notes: { fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em' },
  errBox: { background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 },
}

export function CaptionPage({ image }: Props) {
  const [tone, setTone] = useState('narrativo')
  const { loading, result, error, run } = useGenerateCaption()

  const handleRun = () => {
    if (!image) return
    void run(image.base64, image.type, tone)
  }

  return (
    <>
      {/* Caption controls — left panel section */}
      <div style={s.section}>
        <label style={s.label}>tono preferido</label>
        <div style={s.toneRow}>
          {TONES.map(t => (
            <button key={t} style={s.chip(tone === t)} onClick={() => setTone(t)}>{t}</button>
          ))}
        </div>
      </div>
      <button style={{ ...s.runBtn, marginTop: 8 }} disabled={!image || loading} onClick={handleRun}>
        {loading ? <><Spinner /> generando...</> : '→ generar captions'}
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
          <span style={{ marginTop: 8 }}>generando captions...</span>
        </div>
      )}

      {result && !loading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.04em' }}>2 versiones generadas</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>caption-generator</span>
          </div>
          {result.captions?.map((c, i) => (
            <div key={i} style={s.captionCard}>
              <div style={s.captionMeta}>
                <span style={s.pill}>{c.tone}</span>
                <span style={s.pill}>{c.hook_type}</span>
              </div>
              <p style={s.captionText}>{c.text}</p>
            </div>
          ))}
          {result.notes && <p style={s.notes}>{result.notes}</p>}
        </>
      )}
    </>
  )
}
