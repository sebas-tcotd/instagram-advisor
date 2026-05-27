import type { AIProvider } from '../domain/ports/AIProvider';
import type { AnalyzeRequest } from '../domain/entities/AnalyzeRequest';
import type { PostAnalysisResult } from '../domain/entities/PostAnalysisResult';

export class AnalyzePost {
  constructor(private readonly provider: AIProvider) {}

  async execute(req: AnalyzeRequest): Promise<PostAnalysisResult> {
    return this.provider.analyzePost(req);
  }
}
