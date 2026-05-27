// Typed shape of the post analysis AI response.
// Derived from scripts/analyze.js result rendering (lines 87-98).

export type Verdict = 'listo' | 'ajustar' | 'no va'

export interface Scores {
  visual: string   // e.g. '8/10'
  caption: string  // e.g. '7/10'
  fit: string      // e.g. '9/10'
}

export interface PostAnalysisResult {
  verdict: Verdict
  scores: Scores
  analysis: string
  suggestions: string[]
}
