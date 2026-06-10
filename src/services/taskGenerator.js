import { DataService } from './dataService.js';

/**
 * TaskGenerator creates standardized evaluation scenarios for agents.
 */
export class TaskGenerator {
    constructor(baseDataPath = './public_market_data.json') {
        this.baseDataPath = baseDataPath;
    }

    async generateTasks() {
        const dataService = await DataService.load(this.baseDataPath);

        return [
            {
                id: 'market_stability',
                name: 'Market Stability Benchmark',
                description: 'Normal operations with low volatility.',
                difficulty: 1.0,
                steps: 24,
                data: dataService.data.slice(0, 24)
            },
            {
                id: 'liquidity_crunch',
                name: 'Liquidity Crunch Simulation',
                description: 'High revenue shocks and decreasing cash reserves.',
                difficulty: 1.5,
                steps: 24,
                // Finding a window with high shockProb in public_market_data.json if possible,
                // or creating synthetic hard scenario
                data: this.createHardScenario(dataService.data, 'shockProb', 0.6)
            },
            {
                id: 'fx_volatility',
                name: 'FX Volatility Stress Test',
                description: 'Extreme fluctuations in EUR/USD exchange rates.',
                difficulty: 1.5,
                steps: 24,
                data: this.createHardScenario(dataService.data, 'fxRate', 1.25)
            }
        ];
    }

    createHardScenario(baseData, key, targetValue) {
        // Take a slice and amplify the difficulty factor
        const slice = baseData.slice(0, 24).map(item => {
            const newItem = { ...item };
            if (key === 'shockProb') {
                newItem.shockProb = Math.min(1.0, item.shockProb * 3);
                newItem.sales = item.sales * 0.4;
            } else if (key === 'fxRate') {
                newItem.fxRate = targetValue + (Math.random() * 0.2 - 0.1);
            }
            return newItem;
        });
        return slice;
    }
}
