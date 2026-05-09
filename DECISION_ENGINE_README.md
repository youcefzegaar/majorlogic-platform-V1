# MajorLogic Universal Decision Engine (V2)

## Overview
This update transforms the MajorLogic platform from a domain-specific recommendation engine (Laptops) into a **General-Purpose Decision Execution Platform**. The core logic has been extracted into a declarative, mathematical kernel that can handle any domain via configuration.

## Key Components

### 1. Decision Kernel (DDVM)
A domain-agnostic execution engine that processes a **Decision Intermediate Representation (IR)**. It supports:
- **Topological Execution**: Guaranteed deterministic order of operations using Kahn's algorithm.
- **Immutable Execution Plan**: Pre-compiled and frozen at start-up.
- **Causal Tracing**: Generates a detailed audit trail of every decision step.
- **Penalty & Reward System**: Allows for non-linear scoring adjustments based on qualitative signals.

### 2. Decision Compiler (Semantic & Typed)
A multi-pass compiler that transforms human-readable configurations into the execution IR. It validates:
- **Cycle Detection**: Prevents infinite loops and deadlocks in logic.
- **Semantic Type System**: Enforces mathematical safety (e.g., preventing $Currency + Duration$).
- **Type Contracts**: Strict input/output validation for all math primitives via an Operator Registry.
- **Type Inference**: Automatically deduces resulting data types from complex formulas.

### 3. Decision Governance & Replay
A dedicated layer for transparency, auditability, and production stability:
- **IR Version Locking**: Every logic version is hashed (`irHash`) to ensure historical consistency.
- **Input Snapshotting**: Every decision captures an immutable `inputHash` of the data used.
- **Decision Ledger**: A unique `decisionId` is generated for every execution, linking logic and data.
- **Deterministic Reconstructor**: Allows for 100% accurate re-execution (Replay) of past decisions for verification.

### 4. Decision Explainer (Narrative Layer)
Turns raw execution traces into human-readable stories.
- **Bilingual Support**: English (default) and Arabic.
- **Reasoning Atlas**: Maps technical node IDs to friendly terms.
- **Context-Aware**: Explains why a product was chosen or why it was rejected.

### 5. Identity Manager
A robust deduplication engine that merges products from multiple sources (Amazon, BestBuy, etc.) using:
- **Strict Identifiers**: MPN, SKU.
- **Fuzzy Matching**: Intelligent name normalization.
- **Conflict Resolution**: Weighted attribute selection based on source confidence.

## Domain Implementation Workflow
To add a new domain (e.g., Cars, Servers, Real Estate):
1. Create a `decision-config.json` defining attributes, metrics, and rules.
2. Create a thin `domain-pack.js` wrapper.
3. The platform handles the rest (Acquisition, Identity, Scoring, and Publishing).

## Strategic Value
- **Zero-Code Domain Expansion**: Launch new categories without touching the core runtime.
- **Total Auditability**: Every "Hero" recommendation is backed by a mathematical proof.
- **Explainability**: Builds user trust by showing the "Why" behind the "What".

---
*Developed by MajorLogic Engineering — 2026*
