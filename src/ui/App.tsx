import { useState, useRef, useCallback } from 'react'
import { AnalyzePage } from './pages/AnalyzePage'
import { CaptionPage } from './pages/CaptionPage'

interface ImageState { base64: string; type: string; url: string }

const s = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
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
  tab: (active: boolean) => ({
    padding: '6px 16px 10px', fontSize: 11, letterSpacing: '0.06em',
    background: 'transparent', border: 'none', borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
    color: active ? 'var(--accent)' : 'var(--text-3)', cursor: 'pointer', marginBottom: -1,
  }),
  dropzone: (drag: boolean) => ({
    border: `1px dashed ${drag ? 'var(--accent)' : 'var(--border-md)'}`,
    borderRadius: 'var(--radius-lg)', padding: '32px 20px',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8,
    cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
    background: drag ? 'rgba(212,124,47,0.04)' : 'transparent',
    color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em',
  }),
  preview: { width: '100%', maxHeight: 240, objectFit: 'cover' as const, borderRadius: 'var(--radius)', display: 'block' },
  section: { marginBottom: 20 },
  empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em' },
}

type Tab = 'analyze' | 'caption'

export default function App() {
  const [tab, setTab] = useState<Tab>('analyze')
  const [image, setImage] = useState<ImageState | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadImage = (file: File | null | undefined) => {
    if (!file) return

    const fileType = file.type || ''
    if (!fileType.startsWith('image/')) {
      setImage(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImage({ base64: dataUrl.split(',')[1], type: fileType, url: dataUrl })
    }
    reader.onerror = () => { setImage(null) }
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    loadImage(e.dataTransfer.files[0])
  }, [])

  return (
    <div style={s.root}>
      <header style={s.header}>
        <span style={s.title}>instagram-advisor</span>
        <span style={s.handle}>@sebas_tcotd</span>
      </header>

      <div style={s.body}>
        {/* LEFT PANEL — image upload */}
        <div style={s.panel}>
          <div style={s.tabs}>
            {([['analyze', 'analizar post'], ['caption', 'generar caption']] as [Tab, string][]).map(([val, lbl]) => (
              <button key={val} style={s.tab(tab === val)} onClick={() => setTab(val)}>
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
                  onClick={() => setImage(null)}
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
                onClick={() => fileRef.current?.click()}
              >
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }}
                  onChange={(e) => loadImage(e.target.files?.[0])} />
                <span style={{ fontSize: 22 }}>↑</span>
                <span>arrastra o haz clic para subir</span>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>jpg · png · webp</span>
              </div>
            )}
          </div>

          {!image && (
            <div style={s.empty}>
              <span style={{ fontSize: 28, opacity: 0.2 }}>◎</span>
              <span>sube una foto para comenzar</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — analysis / caption controls and results */}
        <div style={s.right}>
          {tab === 'analyze' && <AnalyzePage image={image} />}
          {tab === 'caption' && <CaptionPage image={image} />}
        </div>
      </div>
    </div>
  )
}
