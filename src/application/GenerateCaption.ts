import type { AIProvider } from '../domain/ports/AIProvider';
import type { CaptionRequest } from '../domain/entities/CaptionRequest';
import type { CaptionResult } from '../domain/entities/CaptionResult';

export class GenerateCaption {
  constructor(private readonly provider: AIProvider) {}

  async execute(req: CaptionRequest): Promise<CaptionResult> {
    return this.provider.generateCaption(req);
  }
}
