// Typed input to the post analysis use case.
// Derived from scripts/analyze.js CLI args (lines 9-14) and App.jsx state.

export interface AnalyzeRequest {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  format: 'post_individual' | 'carrusel' | 'historia' | 'reel'
  layer: 'externa' | 'interna' | 'engineer'
  caption?: string
}
