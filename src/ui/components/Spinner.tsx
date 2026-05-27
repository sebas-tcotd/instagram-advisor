export function Spinner() {
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
