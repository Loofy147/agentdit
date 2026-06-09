/**
 * CreditAwareMPC implements dynamic interest rate feedback loops and FX swaps.
 * Optimizes a 10-step horizon of Borrow, Paydown, and USD-to-EUR Swaps.
 */
export class MPCController {
    constructor(horizon = 10) {
        this.H = horizon;
        this.rBase = 0.05 / 365;
        this.kSpread = 0.02 / 365;
        this.usdYield = 0.04 / 365;
        this.eurYield = 0.025 / 365;
        this.fxSpread = 0.002;
    }

    getDynamicRate(liab, eq) {
        const leverage = liab / (Math.abs(eq) + 1e-9);
        return this.rBase + this.kSpread * (leverage ** 2);
    }

    calculateCost(uVector, currentState, forecastSales, forecastFX) {
        let cost = 0;
        let usdCash = currentState[0];
        let eurCash = currentState[1];
        let liabUsd = currentState[4];
        let eq = currentState[5];
        const mmf = currentState[2];
        const avgDrain = 190;

        for (let i = 0; i < this.H; i++) {
            const borrow = uVector[i * 3];
            const paydown = uVector[i * 3 + 1];
            const swapUsdToEur = uVector[i * 3 + 2];

            const netBorrow = borrow - paydown;
            usdCash += netBorrow;
            liabUsd += netBorrow;

            const actualSwap = Math.min(swapUsdToEur, usdCash);
            usdCash -= actualSwap * (1 + this.fxSpread);
            eurCash += actualSwap / (forecastFX[i] || 1.08);

            const currentR = this.getDynamicRate(liabUsd, eq);
            const interestCharge = liabUsd * currentR;

            usdCash += (forecastSales[i] || 0) - avgDrain;
            liabUsd += interestCharge;
            eq -= interestCharge;

            // Penalties
            let cashPenalty = 0;
            if (usdCash < 200) cashPenalty = 1e8;
            else if (usdCash < 500) cashPenalty = 1e5 / (usdCash - 150);

            const leveragePenalty = ((liabUsd / (Math.abs(eq) + 1e-9)) ** 2) * 10000;

            const totalInvestableUsd = usdCash + (eurCash * (forecastFX[i] || 1.08)) + mmf;
            const maxYield = totalInvestableUsd * this.usdYield;
            const currentWeightedYield = (usdCash * this.rBase) + (eurCash * (forecastFX[i] || 1.08) * this.eurYield) + (mmf * this.usdYield);
            const yieldGapPenalty = maxYield - currentWeightedYield;

            const effortPenalty = 0.05 * (borrow ** 2 + paydown ** 2 + swapUsdToEur ** 2);

            cost += cashPenalty + leveragePenalty + yieldGapPenalty + effortPenalty;
        }
        return cost;
    }

    solve(currentState, forecastSales, forecastFX) {
        let uVector = new Float64Array(this.H * 3).fill(0);
        const learningRate = 1.0;
        const iterations = 50;
        const eps = 1e-3;

        for (let iter = 0; iter < iterations; iter++) {
            const gradients = new Float64Array(this.H * 3);
            const baseCost = this.calculateCost(uVector, currentState, forecastSales, forecastFX);

            for (let i = 0; i < this.H * 3; i++) {
                const originalU = uVector[i];
                uVector[i] += eps;
                const costPlus = this.calculateCost(uVector, currentState, forecastSales, forecastFX);
                gradients[i] = (costPlus - baseCost) / eps;
                uVector[i] = originalU;
            }

            for (let i = 0; i < this.H * 3; i++) {
                uVector[i] -= learningRate * gradients[i];
                // Bounds
                if (i % 3 === 0) uVector[i] = Math.max(0, Math.min(1000, uVector[i])); // Borrow
                if (i % 3 === 1) uVector[i] = Math.max(0, Math.min(1000, uVector[i])); // Paydown
                if (i % 3 === 2) uVector[i] = Math.max(0, Math.min(500, uVector[i]));  // Swap
            }
        }

        return [uVector[0], uVector[1], uVector[2]]; // Return first action set
    }
}
