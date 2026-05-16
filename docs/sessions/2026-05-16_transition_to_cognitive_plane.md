# Session Document: Transition to Cognitive Control Plane (V2 Architecture)
**Date:** 2026-05-16
**Status:** Strategic Pivot - Dual Path Execution
**Architects:** Antigravity (AI) + Engineering Review Board (User)

## 1. The Strategic Context
The MajorLogic Decision Engine has reached a high level of cognitive maturity (V1). To maintain this without delaying market entry, a dual-path execution strategy is established.

## 2. Path A: V1 Public Launch (The "Live Pulse")
- **Goal:** Launch the current engine to interact with real users and harvest real decision data.
- **Data Capture Focus:** 
    - `ml_decision.decision_runs`: Full trace of every cognitive session.
    - `ml_telemetry.interventions`: Records of when and how the `RecoveryEngine` modified constraints.
    - `ml_governance.integrity_reports`: Real-time monitoring of ethical/integrity scores.

## 3. Path B: V2 Control Plane (The "Sovereign UI")
- **Goal:** Build the Next-Gen React-based administration console in parallel.
- **Architectural Shift:**
    - Transitioning from SSR (Server-Side Rendering) to Headless JSON APIs.
    - Adopting a modular React architecture (Features/Services/Zustand).
- **Core Innovations to be Built:**
    - **Shadow Running:** Real-time simulation of rule changes on live data.
    - **Counterfactual Explainer:** Visualizing "what if" scenarios for failed decisions.
    - **Algorithmic Safety Valve:** Ethical drift monitoring for affiliate routing.

## 4. Immediate Technical Actions
1. Reorganize `apps/admin-ui` into the proposed Enterprise structure.
2. Convert all `/admin` routes in `apps/api` to pure JSON endpoints.
3. Maintain current V1 templates as a "Legacy Bridge" until V2 is stable.

---
*Documented under the Cognitive Constitution of MajorLogic.*
