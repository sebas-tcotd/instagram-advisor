// AIProvider — the port (interface) that isolates the application layer from
// any specific AI provider. Implement this interface in src/infrastructure/ai/
// to add a new provider. Change which implementation is used via config.yaml.

import type { AnalyzeRequest } from '../entities/AnalyzeRequest'
import type { CaptionRequest } from '../entities/CaptionRequest'
import type { PostAnalysisResult } from '../entities/PostAnalysisResult'
import type { CaptionResult } from '../entities/CaptionResult'
import type { AuditResult } from '../entities/AuditResult'

export interface AIProvider {
  analyzePost(req: AnalyzeRequest): Promise<PostAnalysisResult>
  generateCaption(req: CaptionRequest): Promise<CaptionResult>
  auditProfile(profileYaml: string): Promise<AuditResult>
}
