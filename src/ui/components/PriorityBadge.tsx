import type { Priority } from '../../domain/entities/AuditResult'

interface Props { priority: Priority }

export function PriorityBadge({ priority }: Props) {
  const map: Record<Priority, { label: string; color: string; bg: string }> = {
    'urgente':   { label: 'urgente',    color: 'var(--red)',    bg: 'var(--red-bg)' },
    'importante': { label: 'importante', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    'mejora':    { label: 'mejora',     color: 'var(--text-3)', bg: 'var(--bg-2)' },
  }
  const v = map[priority] ?? map['mejora']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.06em',
      color: v.color, background: v.bg, border: `1px solid ${v.color}`,
    }}>{v.label}</span>
  )
}
