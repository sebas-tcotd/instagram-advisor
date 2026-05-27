import type { Verdict } from '../../domain/entities/PostAnalysisResult'

interface Props { verdict: Verdict }

export function VerdictBadge({ verdict }: Props) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    'listo':   { label: '✓ listo para publicar', color: 'var(--green)',  bg: 'var(--green-bg)' },
    'ajustar': { label: '⚠ necesita ajustes',    color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    'no va':   { label: '✕ no va al feed',        color: 'var(--red)',   bg: 'var(--red-bg)' },
  }
  const v = map[verdict] ?? map['ajustar']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}
