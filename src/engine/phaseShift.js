/**
 * PhaseShiftModule implements Protocol SLA-2.1: PHASE-SHIFT MODULE.
 * Manages state-transition events (STE) and weight triangulation between
 * Mechanical (M) and Sentiment (S) domains.
 */
export class PhaseShiftModule {
    constructor() {
        this.steActive = false;
        this.alpha = 0.0;
        this.lastDeviation = 0;
        this.frozenLattice = null;
    }

    /**
     * MONITOR ENTROPY (η):
     * Constant check: Is Actual Behavior - Vector B (Mechanical Necessity) > 2-Sigma?
     */
    monitorEntropy(actual, mechanical, sigma) {
        const deviation = Math.abs(actual - mechanical);
        const threshold = 2 * sigma;

        const velocity = Math.abs(deviation - this.lastDeviation);
        this.lastDeviation = deviation;

        if (deviation > threshold) {
            if (!this.steActive) {
                console.log('[PhaseShift] STATE-TRANSITION EVENT (STE) TRIGGERED');
                this.steActive = true;
            }
            this.alpha = this.calculateBlend(velocity);
        } else {
            if (this.steActive) {
                console.log('[PhaseShift] STE RECOVERED');
                this.steActive = false;
            }
            this.alpha = 0.0;
        }

        return { steActive: this.steActive, alpha: this.alpha };
    }

    /**
     * CALCULATE BLEND (α):
     * Based on the velocity of the deviation.
     */
    calculateBlend(velocity) {
        // If movement is instantaneous (Flash Crash), set α to 0.8 immediately.
        // We define "instantaneous" as velocity > 0.5 (arbitrary high threshold for action space)
        if (velocity > 0.5) return 0.8;

        // Otherwise, alpha is proportional to velocity
        return Math.min(1.0, velocity * 2);
    }

    /**
     * EXECUTE BLENDED TRIANGULATION:
     * P = [ (1-α) * SLA-M_Weights ] + [ (α) * SLA-S_Weights ]
     */
    triangulateWeights(weightsM, weightsS, alpha) {
        if (alpha === 0) return weightsM;
        if (alpha === 1) return weightsS;

        const blended = new Float64Array(weightsM.length);
        for (let i = 0; i < weightsM.length; i++) {
            blended[i] = (1 - alpha) * weightsM[i] + alpha * weightsS[i];
        }
        return blended;
    }

    /**
     * BOND CONSERVATION:
     * Atoms cannot be discarded during an STE. They are 'Frozen' in the Lattice.
     */
    conserveBond(stateLattice) {
        if (this.steActive && !this.frozenLattice) {
            this.frozenLattice = new Float64Array(stateLattice);
        } else if (!this.steActive) {
            this.frozenLattice = null;
        }
        return this.frozenLattice || stateLattice;
    }
}
