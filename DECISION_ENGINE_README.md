# MajorLogic Universal Decision Engine (V2)

## Overview
This update transforms the MajorLogic platform from a domain-specific recommendation engine (Laptops) into a **General-Purpose Decision Execution Platform**. The core logic has been extracted into a declarative, mathematical kernel that can handle any domain via configuration.

## Key Components

### 1. Decision Kernel (DDVM)
A domain-agnostic execution engine that processes a **Decision Intermediate Representation (IR)**. It supports:
- **Topological Sorting**: Handles complex attribute dependencies.
- **Mathematical Operators**: Add, Multiply, Inverse, and Comparison.
- **Causal Tracing**: Generates a detailed audit trail of every decision step.
- **Penalty & Reward System**: Allows for non-linear scoring adjustments based on qualitative signals.

### 2. Decision Compiler
A tool that transforms human-readable YAML/JSON configurations into the execution IR. It validates:
- Attribute types.
- Dependency cycles.
- Metric formulas.
- Quality gate conditions.

### 3. Decision Explainer (Narrative Layer)
Turns raw execution traces into human-readable stories.
- **Bilingual Support**: English (default) and Arabic.
- **Reasoning Atlas**: Maps technical node IDs to friendly terms.
- **Context-Aware**: Explains why a product was chosen or why it was rejected.

### 4. Identity Manager
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
