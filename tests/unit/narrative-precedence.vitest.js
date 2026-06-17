import { describe, it, expect, vi } from 'vitest';
import { renderWithAI } from '../../packages/decision-explanation/src/ai-narrative.js';
import { DecisionExplainer } from '../../packages/decision-explanation/src/index.js';

// Trace with a low-scoring dimension and no sacrifices —
// renderTradeoffFromTrace produces: "thermals (63/100) is the lowest-performing dimension for your profile."
// renderBadNewsFromTrace produces: "Our data did not surface a prominent weakness — verify the details that matter to you."
const trace = {
  scores: { thermals_score: 63 },
  sacrifices: {},
  isEligible: true,
};

const makeLogger = () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('GOV-2: narrative precedence — AI may rephrase, not replace', () => {
  it('(a) uses AI text when all factual tokens are preserved', async () => {
    // AI output includes "63" and "thermals" from deterministic tradeoff
    const aiProvider = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({
        story: 'A solid performer for your needs.',
        tradeoff: 'thermals scores 63/100, the lowest dimension for your profile — expect some heat under load.',
        badNews: 'Our data did not surface a prominent weakness — verify the details that matter to you.',
      })),
    };
    const logger = makeLogger();
    const result = await renderWithAI(trace, 'Test Laptop', { locale: 'en' }, { aiProvider, logger });
    // AI text preserved — should be returned as-is (not substituted)
    expect(result.tradeoff).toContain('63');
    expect(result.tradeoff).toContain('thermals');
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('narrative_drift'));
  });

  it('(b) falls back to deterministic text when AI tradeoff is missing factual tokens', async () => {
    // AI tradeoff omits "63" and the dimension name — drift detected
    const aiProvider = {
      generate: vi.fn().mockResolvedValue(JSON.stringify({
        story: 'Great laptop with solid performance.',
        tradeoff: 'This device runs a bit warm under heavy workloads.',
        badNews: 'Our data did not surface a prominent weakness — verify the details that matter to you.',
      })),
    };
    const logger = makeLogger();
    const result = await renderWithAI(trace, 'Test Laptop', { locale: 'en' }, { aiProvider, logger });
    // Must fall back to deterministic text containing "63" and "thermals"
    expect(result.tradeoff).toContain('63');
    expect(result.tradeoff).toContain('thermals');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('narrative_drift'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tradeoff'));
  });

  it('(c) returns deterministic text when AI provider throws', async () => {
    // AI failure → DecisionExplainer falls back to template-narrative path
    const aiProvider = { generate: vi.fn().mockRejectedValue(new Error('API timeout')) };
    const logger = makeLogger();
    const explainer = new DecisionExplainer({ aiProvider, logger });
    const result = await explainer.explain(trace, 'Test Laptop', { locale: 'en', useAI: true });
    // Template path returns deterministic tradeoff containing "63" and "thermals"
    expect(result.tradeoff).toContain('63');
    expect(result.tradeoff).toContain('thermals');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('AI Rendering failed'),
      expect.any(Error),
    );
  });
});
