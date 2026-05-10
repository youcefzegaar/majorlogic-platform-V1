-- 0017_decision_governance_ledger.sql
-- Persistent storage for decision governance: ledger + verification records

CREATE TABLE IF NOT EXISTS public.decision_ledger (
    decision_id TEXT PRIMARY KEY,
    ir_hash TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    score NUMERIC,
    eligible BOOLEAN DEFAULT true,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.decision_verifications (
    decision_id TEXT PRIMARY KEY,
    ir_hash TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    is_matched BOOLEAN NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_ir_hash ON public.decision_ledger (ir_hash);
CREATE INDEX IF NOT EXISTS idx_ledger_recorded ON public.decision_ledger (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_date ON public.decision_verifications (verified_at DESC);
