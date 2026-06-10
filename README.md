# Agentdit: The Global Hydraulic Grid

**Agentdit** is a high-fidelity, autonomous financial execution layer designed for AI-driven treasuries. It combines rigorous double-entry accounting physics with maximum entropy reinforcement learning to create an anti-fragile financial nervous system.

## 🏗 Architecture: The 19-Layer Stack

The system is built upon three fundamental pillars:

1.  **Physics (The Pacioli Ledger):** A vector-based, multi-currency double-entry bookkeeping engine that enforces absolute ledger integrity (sub-e-12 invariant deviation).
2.  **Intelligence (Neural Hydraulics):** A Soft Actor-Critic (SAC) reinforcement learning agent optimized for "Bolt Tempo" inference (< 0.2ms), maintaining strategy diversity through maximum entropy.
3.  **Governance (Evaluation & Evolution):** A programmatic assessment layer that monitors agent performance across 7 metrics (Task Success, Reasoning, Tool-Use, Planning, Efficiency, Robustness, Safety) and triggers re-training if health thresholds are breached.

## 🚀 Key Features

*   **Bolt Tempo Inference:** Neural inference latency optimized to sub-millisecond ranges using pre-allocated buffers and non-allocating matrix views.
*   **Maximum Entropy RL:** Uses SAC to maintain policy diversity, ensuring resilience against "unknown unknowns" and preventing regime over-optimization.
*   **Multi-Currency Grid:** Simultaneous management of USD, EUR (with dynamic basis risk), and Yield Assets (MMF).
*   **Behavioral Fingerprinting:** Automatically classifies agent strategies as Aggressive (Leveraged Growth), Balanced, or Conservative (Liquidity Focused).

## 📁 Repository Structure

*   `src/engine/`: High-performance financial logic and neural controllers.
*   `src/services/`: Business logic, Evaluation, Registry, and Data services.
*   `scripts/`: Training and high-level benchmark pipelines.
*   `tools/`: Diagnostic and invariant verification utilities.
*   `playwright-tests/`: E2E UI/UX verification suite.

## 🛠 Usage

### Installation
```bash
pnpm install
```

### Running Benchmarks
To evaluate the current agent and generate a performance profile:
```bash
node scripts/run_benchmarks.js
```
Results are persisted in `agent_registry.json`.

### Training
To evolve a new policy on real market data:
```bash
node scripts/train_v17_real_data.js
```

### Diagnostics
Verify ledger integrity:
```bash
node tools/check_invariants.js
```

## ⚖️ Ledger Law
The fundamental law of Agentdit is the **Steel Cage**:
$$Assets - (Liabilities + Equity) = 0.0$$
No neural policy or market shock is permitted to violate this invariant.

## 📊 Performance Evaluation System

Agentdit includes a comprehensive evaluation framework to measure agent performance across multiple dimensions:

*   **Task Success:** Survival, equity growth, and leverage management.
*   **Reasoning Quality:** Correlation between risk signals (shockProb) and defensive actions.
*   **Tool-Use Accuracy:** Optimality of action vectors and ledger integrity.
*   **Efficiency:** Inference latency (Bolt Tempo) and resource utilization.
*   **Robustness:** Stability under high-stress scenarios (Liquidity Crunch, FX Volatility).

### Running Benchmarks
To evaluate the current Hero Agent:
```bash
node scripts/run_benchmarks.js
```
Results are saved to `benchmark_report.json`.
