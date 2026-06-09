# Agentdit: The Global Hydraulic Grid

**Agentdit** is a high-fidelity, autonomous financial execution layer designed for the next generation of AI-driven treasuries. It combines rigorous double-entry accounting physics with adversarial reinforcement learning to create an anti-fragile financial nervous system.

## 🏗 Architecture: The 16-Layer Stack

The system is built upon three fundamental pillars:

1.  **Physics (The Pacioli Ledger):** A vector-based, double-entry bookkeeping engine that enforces absolute ledger integrity (0.0 invariant deviation) across multi-currency state vectors.
2.  **Intelligence (Neural Hydraulics):** A Soft Actor-Critic (SAC) reinforcement learning agent that has learned to steer the balance sheet through trial and error, optimizing for growth, liquidity, and credit health.
3.  **Resilience (Adversarial GAN):** The policy is forged in an adversarial environment where a 'Villain' agent (The Market) mathematically searches for coordinates attacks (revenue shocks + FX volatility) to break the treasury.

## 🚀 Key Features

*   **Bolt Tempo Inference:** Neural inference latency optimized to **sub-millisecond ranges (~0.18ms)**, enabling real-time reaction to market physics.
*   **Maximum Entropy RL:** Uses SAC to maintain policy diversity, ensuring the system is never over-optimized for a single market regime and remains resilient to "unknown unknowns."
*   **Multi-Currency Grid:** Simultaneous management of USD, EUR (with dynamic basis risk), and Yield Assets (MMF).
*   **Credit-Default Integration:** Dynamic interest rates are modeled as a non-linear function of leverage ( = f(L^2)$), creating "Debt Gravity."

## 📁 Repository Structure

*   `src/engine/`: Core logic including the `PacioliEngine`, `SACController`, and neural architectures.
*   `src/services/`: Support services like `HealthService` (Stress Index) and `TreasuryBridge`.
*   `scripts/`: Training environments for neuroevolution and adversarial co-training.
*   `playwright-tests/`: UI/UX verification suite.

## 🛠 Setup & Usage

### Installation
```bash
pnpm install
```

### Run Simulation
Start a local server to view the real-time financial dashboard:
```bash
python3 -m http.server 8080
```

### Testing
```bash
pnpm test
```

### Training
To re-train the adversarial agents:
```bash
node scripts/train_v14_adversarial.js
node scripts/train_v16_sac.js
```

## ⚖️ Ledger Invariant
The fundamental law of Agentdit is the **Steel Cage**:
3237Assets - (Liabilities + Equity) = 0.03237
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
