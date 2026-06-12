/**
 * CognitionService v2.1 - Layer 19 Hyper-Reality.
 */
export class CognitionService {
    constructor() {}

    generateInsight(market, actions, confidence, stds, steActive, alpha, invalidationTrigger, intervention = null, macro = {}) {
        const riskAreas = [];
        if (stds[0] > 0.2) riskAreas.push('Liability Management');
        if (stds[1] > 0.2) riskAreas.push('FX Basis Hedging');
        if (stds[2] > 0.2) riskAreas.push('MMF Rebalancing');

        const actionFocus = this.interpretActions(actions);
        const policyMode = steActive ? 'Blended (M+S)' : 'Mechanical (M)';
        const macroContext = macro.monetary?.mode === 'QE' ? 'liquidity injection' : 'liquidity drain (QT)';

        return {
            title: steActive ? `PHASE-SHIFT DETECTED: ${market.regime} [${(alpha * 100).toFixed(0)}% Sentiment Blend]` : `Market Report: ${market.date} [Confidence: ${confidence.toFixed(1)}%]`,
            content: `### 🌐 Market Dynamics
- **Regime:** ${market.regime}
- **Shock Prob:** ${(market.shockProb * 100).toFixed(1)}% | **VIX:** ${market.vix.toFixed(1)}
- **Macro Base:** ${macroContext.toUpperCase()}

### 🛡️ Policy Intelligence (Layer 18 & SLA-2.1)
- **Overall Confidence:** ${confidence.toFixed(1)}%
- **Inference Mode:** ${policyMode}
- **Action Basis:** ${actionFocus}

### ⚖️ Institutional Strategy
- **Lattice Stability:** ${market.shockProb < 0.3 ? 'Nominal' : 'Resonant Decay'}
- **Strategic Recommendation:** ${intervention ? `Bolster ${intervention.name.replace(/_/g, ' ')} (+2.0 VS)` : 'Maintain current baseline'}`,
            cognition: `${steActive ? '[PHASE-SHIFT ACTIVE] ' : ''}Kinetic resonance monitoring indicates ${confidence < 80 ? 'elevated' : 'stable'} policy uncertainty.
Protocol SLA-2.1 has re-calibrated the Invalidation Trigger to ${invalidationTrigger}.
Triangulated alpha of ${alpha.toFixed(2)} based on ${market.regime} volatility and ${macroContext}.
Relational atoms frozen in lattice to preserve bond context during STE.
Primary policy intent: ${actionFocus}.
Optimization suggest ${intervention ? intervention.name : 'no current'} intervention buys the most time.`,
            alignment: steActive ? 95 : 100
        };
    }

    interpretActions(actions) {
        const [debt, fx, invest] = actions;
        const intents = [];
        if (Math.abs(debt) > 0.1) intents.push(debt > 0 ? 'Leverage expansion' : 'Debt reduction');
        if (Math.abs(fx) > 0.1) intents.push(fx > 0 ? 'EUR exposure' : 'USD consolidation');
        if (Math.abs(invest) > 0.1) intents.push(invest > 0 ? 'Liquidity deployment' : 'Cash preservation');
        return intents.length > 0 ? intents.join(', ') : 'Maintain current position';
    }
}
