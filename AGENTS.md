# Agent Intelligence Standards (AGENTS.md)

This file defines the programmatic and architectural constraints for any agent operating within the Agentdit repository.

## 1. The "Steel Cage" Ledger Rule
Every financial action **must** be executed through the `PacioliEngine.post(dr, cr, amt)` method.
*   **Constraint:** The ledger invariant must be verified after every simulation step.
*   **Threshold:** Any deviation greater than $1e-9$ is a catastrophic failure.

## 2. "Bolt Tempo" Performance Requirement
To enable high-frequency financial control, neural inference must remain instantaneous.
*   **Requirement:** Inference latency ($t_{infer}$) must be $< 1ms$.
*   **Optimization:** Use pre-allocated `Float64Array` buffers and `.subarray()` views. Avoid object allocation in the hot loop.

## 3. Policy Anti-Fragility (Layer 16)
Agents should not converge on deterministic paths.
*   **Principle:** Policy Entropy must be maintained above 1.0 during stable market periods to ensure exploration.

## 4. Multi-Currency Basis Risk
All foreign currency accounts must be normalized via `fxRate` during transactions. Revaluation must be handled via `PacioliEngine.revalueFX(newRate)`, with gains/losses tracked in `FX_Reval_Adj`.

## 5. Performance Evaluation (Layer 19)
All agent updates must be benchmarked using the standard Evaluation System.
*   **Requirement:** Any regression in 'Safety' or 'Robustness' scores requires a policy re-training.
*   **Compliance:** 'Efficiency' score must remain $> 0.9$ (Bolt Tempo compliance).

## 6. Testing Mandatory Checks
Before submitting any change to the financial core:
1.  Run `pnpm test` to verify accounting invariants.
2.  Run the verification script `python3 /home/jules/verification/verify_v16.py` to confirm dashboard telemetry.

## 7. Performance Evaluation (Layer 19)
All agent updates must be benchmarked using the standard Evaluation System.
*   **Requirement:** Any regression in 'Reasoning' or 'Robustness' scores requires a policy re-training.
*   **Threshold:** 'Efficiency' score must remain > 0.9 (Bolt Tempo compliance).
