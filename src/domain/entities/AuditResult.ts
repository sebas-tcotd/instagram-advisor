// Phase 1 scaffold — full implementation in Phase 2 (PROF-01/PROF-02/PROF-03)
// Typed shape for the profile audit AI response.

export interface AuditResult {
  overallScore: number
  strengths: string[]
  improvements: string[]
  recommendations: string[]
}
