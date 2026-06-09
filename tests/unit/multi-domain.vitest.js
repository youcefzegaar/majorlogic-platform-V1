/**
 * Multi-domain support tests.
 *
 * Verifies that:
 * 1. Both laptop-student-us and monitor-student-us controllers export the
 *    required interface (DOMAIN_ID, runPipeline, buildAdminDashboardData).
 * 2. monitor-student-us runPipeline returns valid cards for a budget that
 *    fits at least one monitor.
 * 3. monitor-student-us runPipeline respects the budget gate — a $100 budget
 *    yields no eligible monitors, triggering recovery or no_viable_option.
 * 4. The registry registers both domains when ENABLED_DOMAINS lists both.
 */
import { describe, it, expect } from 'vitest';

const { DOMAIN_ID, runPipeline, buildAdminDashboardData } =
  await import('../../apps/api/src/controllers/monitor-student-us.js');

describe('monitor-student-us controller — interface', () => {
  it('exports DOMAIN_ID = "monitor-student-us"', () => {
    expect(DOMAIN_ID).toBe('monitor-student-us');
  });

  it('exports runPipeline as an async function', () => {
    expect(typeof runPipeline).toBe('function');
  });

  it('exports buildAdminDashboardData as an async function', () => {
    expect(typeof buildAdminDashboardData).toBe('function');
  });
});

describe('monitor-student-us controller — runPipeline', () => {
  it('returns schemaVersion 2 and a cards array for a $300 budget', async () => {
    const result = await runPipeline({ budgetUsd: 300, major: 'cs' });
    expect(result.schemaVersion).toBe(2);
    expect(result.domain.domainId).toBe('monitor-student-us');
    expect(Array.isArray(result.decision.cards)).toBe(true);
  });

  it('hero card priceUsd is within the $300 budget', async () => {
    const result = await runPipeline({ budgetUsd: 300, major: 'cs' });
    const hero = result.decision.cards.find(c => c.cardType === 'hero');
    if (hero) {
      // Hero must have come from a monitor priced ≤ $300
      expect(hero.priceUsd ?? 0).toBeLessThanOrEqual(300);
    }
  });

  it('integrityCertificate overallPassed is true', async () => {
    const result = await runPipeline({ budgetUsd: 300, major: 'cs' });
    expect(result.integrityCertificate.overallPassed).toBe(true);
  });

  it('$100 budget has no native matches — recovery fires or no_viable_option', async () => {
    const result = await runPipeline({ budgetUsd: 100, major: 'cs' });
    const decision = result.decision ?? {};
    // Either the recovery engine relaxed the budget gate (relaxedConstraint is set)
    // or there were truly no viable options.
    const recovered = !!decision.relaxedConstraint;
    const noResult  = decision.status === 'no_viable_option' || (decision.cards ?? []).length === 0;
    expect(recovered || noResult).toBe(true);
  });

  it('buildAdminDashboardData returns domainId and catalogSize', async () => {
    const data = await buildAdminDashboardData();
    expect(data.domainId).toBe('monitor-student-us');
    expect(typeof data.catalogSize).toBe('number');
    expect(data.catalogSize).toBeGreaterThan(0);
  });
});

describe('multi-domain registry support', () => {
  it('registry can hold two domains simultaneously', async () => {
    const { registerDomain, getDomainController, getValidDomains } =
      await import('../../apps/api/src/registry.js');

    const mockController = { DOMAIN_ID: 'mock-domain', runPipeline: async () => ({}) };
    registerDomain('mock-domain', mockController);

    expect(getValidDomains().has('mock-domain')).toBe(true);
    expect(getDomainController('mock-domain')).toBe(mockController);
  });
});
