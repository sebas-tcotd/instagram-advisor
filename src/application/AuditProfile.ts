// AuditProfile use case — Phase 1 scaffold.
// The AIProvider.auditProfile() implementation is in Phase 2 (PROF-01/PROF-02/PROF-03).
// The use case class is complete; only the provider body is deferred.

import type { AIProvider } from '../domain/ports/AIProvider';
import type { AuditResult } from '../domain/entities/AuditResult';

export class AuditProfile {
  constructor(private readonly provider: AIProvider) {}

  async execute(profileYaml: string): Promise<AuditResult> {
    return this.provider.auditProfile(profileYaml);
  }
}
