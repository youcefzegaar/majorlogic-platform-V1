# Cognitive Control Plane - Architectural Philosophy
**Status:** In Development (V2)
**Goal:** Achieve 100% Transparency and Real-time Governance for MajorLogic Decision Intelligence.

## 🧠 The Philosophical Shift
MajorLogic is not a black-box AI. It is a **Transparent Decision Engine**. The Control Plane (V2) exists to ensure that every recommendation is traceable to a specific logic gate and that any "compromise" (recovery) is audited.

## 🏗️ Architectural Layers

### 1. Data Exposition (The Ledger)
- **Table:** `ml_decision.decision_runs`
- **Purpose:** Stores the input profile, the ruleset used, and the output cards.
- **Table:** `ml_telemetry.interventions`
- **Purpose:** Records when the `RecoveryEngine` relaxes a constraint to avoid zero-results.

### 2. Decision Forensics (The Replay Viewer)
- **Path:** `DecisionTraceView.jsx`
- **Mechanism:** Uses the `admin-decision-api` SDK to re-execute a historical decision with the *exact* profile and ruleset versions from that time.
- **Value:** Allows admins to answer "Why did this user get this result?" with surgical precision.

### 3. Shadow Running (Simulative Impact)
- **Goal:** Predict the impact of changing a rule weight before it goes live.
- **Mechanism:** Executes the modified ruleset against a sample of the last 5,000 real decision runs.
- **Outcome:** Metrics on Zero-Result rates, satisfy delta, and commercial bias.

### 4. Ethical Guardrails
- **Metric:** Commercial Drift
- **Logic:** Monitoring the correlation between product ranking and affiliate commission levels.
- **Kill Switch:** Automated suspension of logic changes if drift exceeds established thresholds.

## 🛡️ Security Guidelines
1. **Masking:** PII (Personally Identifiable Information) must be masked in forensic traces.
2. **Roles:** Replay access requires `role: ADMIN_FORENSICS`.
3. **Audit:** Every viewing of a trace is logged in `ml_governance.audit_log`.

---
*Built for the Age of Explained Intelligence.*
