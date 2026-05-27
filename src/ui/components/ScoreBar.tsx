interface Props { label: string; score: string }

export function ScoreBar({ label, score }: Props) {
  const match = score.match(/^(\d+)\s*\/\s*(\d+)$/)
  const pct = match ? (parseInt(match[1]) / parseInt(match[2])) * 100 : 0
  const displayScore = match ? score : score || '—'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)', fontSize: 11 }}>
        <span>{label}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{displayScore}</span>
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
