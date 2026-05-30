// Typed shape of the profile audit AI response.
// Schema derived from prompts/profile-auditor.md response format.
// Co-located types follow PostAnalysisResult.ts pattern.

/** Priority levels for checklist items in a profile audit. */
export type Priority = 'urgente' | 'importante' | 'mejora'

/** A single actionable item in the profile audit checklist. */
export interface ChecklistItem {
  priority: Priority
  element: string
  issue: string
  action: string
}

export interface AuditResult {
  /** Numeric score parsed from the AI "X/10" string (D-02). */
  overallScore: number
  /** 1-2 line summary of the current profile state (D-03). */
  status: string
  /** Prioritized action list — max 7 items per prompt spec. */
  checklist: ChecklistItem[]
  /**
   * Strengths already working well that should be maintained.
   * Satisfies PROF-03: audit must surface at least one strength.
   */
  wins?: string[]   // AI may omit — callers must guard
}
