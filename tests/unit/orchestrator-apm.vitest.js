/**
 * APM tracing tests for the DDVM pipeline.
 *
 * Verifies that startSpan/endSpan are called for each pipeline step and the
 * root span, and that a step failure records the error on the span and
 * propagates it to the caller.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Spy on tracing module BEFORE importing the orchestrator ──────────────────
const mockSpan = {
  end:             vi.fn(),
  setStatus:       vi.fn(),
  recordException: vi.fn(),
};
const startSpanMock = vi.fn(() => mockSpan);
const endSpanMock   = vi.fn();

vi.mock('../../packages/decision-orchestrator/src/tracing.js', () => ({
  startSpan: startSpanMock,
  endSpan:   endSpanMock,
}));

const { DecisionOrchestrator } = await import('../../packages/decision-orchestrator/src/index.js');

// ── Minimal domain config ─────────────────────────────────────────────────────
const CONFIG = {
  domainId: 'apm-test-domain',
  version: '1.0.0',
  profileMapping: {},
  intentVariants: [{ intentId: 'general', conditions: [] }],
  defaultIntentId: 'general',
  executionPlan: [
    { id: 'final', type: 'score', weights: { perf: 1.0 }, isFinal: true, dependsOn: [] },
  ],
};
const PROFILE = { perf: 80 };
const ENTITIES = [{ entityId: 'e1', perf: 80 }];

describe('DDVM pipeline — APM tracing', () => {
  let orchestrator;

  beforeEach(() => {
    startSpanMock.mockClear();
    endSpanMock.mockClear();
    orchestrator = new DecisionOrchestrator();
  });

  it('startSpan is called for the root span (ddvm.run)', async () => {
    await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    const rootCall = startSpanMock.mock.calls.find(c => c[0] === 'ddvm.run');
    expect(rootCall).toBeTruthy();
  });

  it('root span attributes include domainId and entityCount', async () => {
    await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    const rootCall = startSpanMock.mock.calls.find(c => c[0] === 'ddvm.run');
    expect(rootCall[1]['ddvm.domainId']).toBe('apm-test-domain');
    expect(rootCall[1]['ddvm.entityCount']).toBe(1);
  });

  it('startSpan is called once per pipeline step (8 steps + 1 root = 9 total)', async () => {
    await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    expect(startSpanMock.mock.calls.length).toBe(9);
  });

  it('each step span name starts with ddvm.step.', async () => {
    await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    const stepSpans = startSpanMock.mock.calls.filter(c => c[0].startsWith('ddvm.step.'));
    expect(stepSpans.length).toBe(8);
    for (const [name] of stepSpans) {
      expect(name).toMatch(/^ddvm\.step\._step[A-Z]/);
    }
  });

  it('endSpan is called for every span (9 ends on success)', async () => {
    await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    expect(endSpanMock.mock.calls.length).toBe(9);
  });

  it('endSpan is called with the error when a step throws', async () => {
    const boom = new Error('step exploded');
    // Patch one step to throw after construction
    const orig = orchestrator._stepCompilation.bind(orchestrator);
    orchestrator._stepCompilation = async () => { throw boom; };

    await expect(orchestrator.run(CONFIG, ENTITIES, PROFILE)).rejects.toThrow('step exploded');

    // endSpan must have been called with the error at least once
    const errorEnds = endSpanMock.mock.calls.filter(c => c[1] === boom);
    expect(errorEnds.length).toBeGreaterThanOrEqual(1);
  });

  it('pipeline still works when startSpan returns null (OTel disabled)', async () => {
    startSpanMock.mockReturnValue(null);
    const result = await orchestrator.run(CONFIG, ENTITIES, PROFILE);
    expect(result.status).toBe('ok');
    expect(Array.isArray(result.cards)).toBe(true);
  });
});
