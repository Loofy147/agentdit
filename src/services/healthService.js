export class HealthService {
    calculateMetrics(state, mpc) {
        const { liabilities, equity, intAccrual, leverage, totalAssetsUsd, eurCash, fxRate, fxRevalAdj } = state;

        const totalLiab = liabilities + intAccrual;
        const currentR = mpc.getDynamicRate(totalLiab, equity + fxRevalAdj);
        const annualizedRateBps = (currentR * 365 * 10000).toFixed(0);

        let stressIndex = 100;
        if (leverage > 2.0) stressIndex -= (leverage - 2.0) * 15;
        if (state.usdCash < 300) stressIndex -= (300 - state.usdCash) / 3;

        return {
            leverage: leverage.toFixed(2),
            interestRateBps: annualizedRateBps,
            stressIndex: Math.max(0, Math.min(100, stressIndex)).toFixed(1),
            totalAssetsUsd: totalAssetsUsd.toFixed(0),
            eurUsdEq: (eurCash * fxRate).toFixed(0),
            fxRevalImpact: fxRevalAdj.toFixed(2)
        };
    }
}
