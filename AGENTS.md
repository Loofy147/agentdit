# Agent Intelligence Standards (AGENTS.md)

This file defines the programmatic and architectural constraints for any agent operating within the Agentdit repository.

## 1. The "Steel Cage" Ledger Rule
Every financial action **must** be executed through the `PacioliEngine.post(dr, cr, amt)` method.
*   **Constraint:** The ledger invariant ( - L - E = 0$) must be verified after every simulation step.
*   **Threshold:** Any deviation greater than e-9$ is considered a catastrophic failure.

## 2. "Bolt Tempo" Performance Requirement
To enable high-frequency financial control, neural inference must remain instantaneous.
*   **Requirement:** Inference latency ({infer}$) must be $< 1ms$.
*   **Optimization:** Use pre-allocated `Float64Array` buffers and avoid object allocation in the simulation hot loop.

## 3. Policy Anti-Fragility (Layer 16)
Agents should not converge on deterministic "perfect" paths.
*   **Principle:** Policy Entropy ($) must be maintained above 1.0 during stable market periods.
*   **Verification:** Ensure the SAC controller's `log_std` is not collapsing to zero.

## 4. Multi-Currency Basis Risk
All non-USD accounts must be revalued at every tick using `PacioliEngine.revalueFX(newRate)`. The resulting `FX_Reval_Adj` must be tracked as a separate equity-like account to ensure transparency of unrealized gains/losses.

## 5. Directory Conventions
*   `/src/engine/`: High-performance, side-effect-free financial logic.
*   `/src/services/`: Business logic and UI mapping.
*   `/scripts/`: Resource-intensive training and optimization tasks.

## 6. Testing Mandatory Checks
Before submitting any change to the financial core:
1.  Run `pnpm test` to verify accounting invariants.
2.  Run the verification script `python3 /home/jules/verification/verify_v16.py` to confirm dashboard telemetry.

## 7. Performance Evaluation (Layer 19)
All agent updates must be benchmarked using the standard Evaluation System.
*   **Requirement:** Any regression in 'Reasoning' or 'Robustness' scores requires a policy re-training.
*   **Threshold:** 'Efficiency' score must remain > 0.9 (Bolt Tempo compliance).
