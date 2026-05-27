// Typed shape of the caption generation AI response.
// Derived from scripts/caption.js result rendering (lines 77-84).

export interface Caption {
  tone: string
  hook_type: string
  text: string
}

export interface CaptionResult {
  captions: Caption[]
  notes?: string
}
