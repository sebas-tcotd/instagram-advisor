import { describe, it, expect, vi } from 'vitest';
import type { AIProvider } from '../domain/ports/AIProvider';
import type { AuditResult } from '../domain/entities/AuditResult';
import { AuditProfile } from './AuditProfile';

const mockResult: AuditResult = {
  overallScore: 7,
  status: 'El perfil comunica bien la identidad visual pero falta pulir la bio.',
  checklist: [
    {
      priority: 'urgente',
      element: 'Bio',
      issue: 'No responde qué haces desde dónde',
      action: 'Reescribir con la estructura: qué haces / desde dónde / credencial',
    },
  ],
  wins: ['Feed B&N consistente que refuerza la identidad visual'],
}

describe('AuditProfile', () => {
  it('calls provider.auditProfile() exactly once with the given profileYaml string', async () => {
    const provider = {
      analyzePost: vi.fn(),
      generateCaption: vi.fn(),
      auditProfile: vi.fn().mockResolvedValue(mockResult),
    } as unknown as AIProvider

    const useCase = new AuditProfile(provider)
    const profileYaml = 'name: Sebastian\nbio: photographer'
    await useCase.execute(profileYaml)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(provider.auditProfile)).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(vi.mocked(provider.auditProfile)).toHaveBeenCalledWith(profileYaml)
  })

  it('returns the AuditResult from the provider without modification', async () => {
    const provider = {
      analyzePost: vi.fn(),
      generateCaption: vi.fn(),
      auditProfile: vi.fn().mockResolvedValue(mockResult),
    } as unknown as AIProvider

    const useCase = new AuditProfile(provider)
    const result = await useCase.execute('profile yaml')

    expect(result).toBe(mockResult)
  })

  it('propagates provider errors without wrapping', async () => {
    const provider = {
      analyzePost: vi.fn(),
      generateCaption: vi.fn(),
      auditProfile: vi.fn().mockRejectedValue(new Error('API failure')),
    } as unknown as AIProvider

    const useCase = new AuditProfile(provider)

    await expect(useCase.execute('profile yaml')).rejects.toThrow('API failure')
  })
})
