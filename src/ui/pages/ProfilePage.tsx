import { load } from 'js-yaml'
import { useAuditProfile } from '../hooks/useAIProvider'
import { ScoreBar } from '../components/ScoreBar'
import { PriorityBadge } from '../components/PriorityBadge'
import { Spinner } from '../components/Spinner'
import type { ChecklistItem, Priority } from '../../domain/entities/AuditResult'
import profileYaml from '@root/profile.yaml?raw'

const profile = load(profileYaml) as Record<string, unknown>
const identity = profile['identity'] as Record<string, unknown> | undefined
const profileHandle = identity ? (identity['username'] as string | undefined) : undefined
const profileName = identity ? (identity['display_name'] as string | undefined) : undefined
const bioTarget = profile['bio_target'] as string | undefined
const bioExcerpt = bioTarget ? bioTarget.trim().slice(0, 80) : undefined

const PRIORITIES: Priority[] = ['urgente', 'importante', 'mejora']

const s = {
  section: { marginBottom: 20 },
  label: {
    fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)',
    textTransform: 'uppercase' as const, marginBottom: 6, display: 'block',
  },
  runBtn: {
    width: '100%', padding: '10px', fontSize: 11, letterSpacing: '0.08em',
    borderColor: 'var(--border-md)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' },
  empty: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: 8,
    color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.04em',
  },
  errBox: {
    background: 'var(--red-bg)', border: '1px solid var(--red)',
    borderRadius: 'var(--radius)', padding: '10px 14px',
    color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6,
  },
  profileSummary: {
    background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16,
  },
  statusText: { fontSize: 12, color: 'var(--text-3)', margin: '8px 0 16px' },
  priorityGroup: { marginBottom: 16 },
  checklistItem: {
    marginBottom: 12, paddingLeft: 8, borderLeft: '2px solid var(--border)',
  },
  winsItem: { fontSize: 12, color: 'var(--text-2)', marginBottom: 6, lineHeight: 1.5 },
}

export function ProfilePage() {
  const { loading, result, error, run } = useAuditProfile()

  return (
    <>
      {/* Left panel — profile summary */}
      <div style={s.profileSummary}>
        <span style={s.label}>perfil</span>
        {profileHandle && (
          <div style={{ marginBottom: 8 }}>
            <span style={s.label}>handle</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>@{profileHandle}</span>
          </div>
        )}
        {profileName && (
          <div style={{ marginBottom: 8 }}>
            <span style={s.label}>nombre</span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{profileName}</span>
          </div>
        )}
        {bioExcerpt && (
          <div>
            <span style={s.label}>bio</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, display: 'block' }}>
              {bioExcerpt}
            </span>
          </div>
        )}
      </div>

      <button
        style={s.runBtn}
        disabled={loading}
        onClick={() => void run()}
      >
        {loading ? <><Spinner /> auditando...</> : '→ auditar perfil'}
      </button>

      {/* Results */}
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
          <span style={{ marginTop: 8 }}>auditando perfil...</span>
        </div>
      )}

      {result && !loading && (
        <>
          <hr style={s.divider} />
          <ScoreBar label="puntuación general" score={`${result.overallScore}/10`} />
          <p style={s.statusText}>{result.status}</p>
          <hr style={s.divider} />

          {PRIORITIES.map((priority) => {
            const items = result.checklist.filter((item: ChecklistItem) => item.priority === priority)
            if (items.length === 0) return null
            return (
              <div key={priority} style={s.priorityGroup}>
                <div style={{ marginBottom: 8 }}>
                  <PriorityBadge priority={priority} />
                </div>
                {items.map((item: ChecklistItem, i: number) => (
                  <div key={i} style={s.checklistItem}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {item.element}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 2 }}>
                      {item.issue}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--text-3)' }}>→ </span>{item.action}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {result.wins && result.wins.length > 0 && (
            <>
              <hr style={s.divider} />
              <div>
                <span style={s.label}>lo que funciona</span>
                {result.wins.map((win: string, i: number) => (
                  <div key={i} style={s.winsItem}>
                    <span style={{ color: 'var(--green)' }}>✓ </span>{win}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}
