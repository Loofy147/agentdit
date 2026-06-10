# ARCHITECTURE.md: The Global Hydraulic Grid

## 1. The 19-Layer Stack
Agentdit is organized into a hierarchical stack of intelligence and physics:

*   **Layer 1-8:** Account State Vector (Cash, EUR, MMF, AR, Liab, Eq, FX_Adj, Int).
*   **Layer 9-13:** Market Signal Ingestion (FX, Sales, VIX, Shock Probability, Recession Probability).
*   **Layer 14-15:** Adversarial GAN Training & DAO Governance Bridging.
*   **Layer 16-18:** Maximum Entropy RL (SAC) & Bayesian Volatility Surface (MC Dropout).
*   **Layer 19:** Performance Evaluation & Automated Evolution.

## 2. The Pacioli Ledger Engine (`src/engine/pacioli.js`)
The engine implements a multi-currency double-entry system.
- **Double Entry:** Every `post` requires a Debit and a Credit, ensuring the accounting identity $A = L + E$ is always balanced.
- **Currency Normalization:** Foreign currency accounts (EUR) are normalized to the base currency (USD) at the time of transaction using the current market `fxRate`.
- **FX Revaluation:** Changes in exchange rates are captured in a separate `FX_Reval_Adj` account, providing transparency into unrealized gains/losses without polluting the base Equity.

## 3. Intelligence Layer (`src/engine/sacController.js`)
Implemented using Soft Actor-Critic (SAC), the controller maps an 11-dimension state vector to a 3-dimension action distribution.
- **State Vector:** [8 accounts, shockProb, vix, recessionProb].
- **Actions:** [Borrow/Repay, USD/EUR Swap, Cash/MMF Reallocation].
- **Entropy Bonus:** The agent is rewarded for maintaining strategy diversity (Entropy), preventing collapse into fragile, deterministic behavior.

## 4. Evaluation System (`src/services/evalService.js`)
Agents are assessed using a weighted aggregator of 7 metrics:
1.  **Task Success (30%):** Measures net worth growth and leverage management.
2.  **Reasoning (20%):** Measures proactive defensive responses to high `shockProb` signals.
3.  **Tool-Use (15%):** Measures ledger integrity and action optimality.
4.  **Planning (15%):** Measures action consistency and lack of chaotic oscillation.
5.  **Efficiency (10%):** Measures "Bolt Tempo" compliance (inference latency).
6.  **Robustness (5%):** Measures survival and stability during extreme market stress.
7.  **Safety (5%):** Measures total avoidance of insolvency and invariant breaches.

## 5. Automated Evolution Loop (`src/services/evolutionService.js`)
The system monitors the health of the active agent. If metrics fall below thresholds (e.g., Safety < 0.9), the system can automatically trigger a re-training cycle (`scripts/train_v17_real_data.js`) to adapt to new market regimes.
