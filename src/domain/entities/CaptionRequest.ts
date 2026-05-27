// Typed input to the caption generation use case.
// Derived from scripts/caption.js CLI args (lines 9-11).

export interface CaptionRequest {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  tone: 'narrativo' | 'introspectivo' | 'sensorial' | 'proceso' | 'tensión'
}
