import { TaskGenerator } from '../src/services/taskGenerator.js';
import { EvaluationService } from '../src/services/evalService.js';
import { SACController } from '../src/engine/sacController.js';
import { RegistryService } from '../src/services/registryService.js';
import { EvolutionService } from '../src/services/evolutionService.js';
import fs from 'fs';

async function runBenchmark() {
    console.log('--- Agent Performance Evaluation & Evolution System ---');

    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();
    const evalService = new EvaluationService();
    const registry = new RegistryService();
    const evolution = new EvolutionService(registry);

    // Load Hero Agent (SAC)
    let hw;
    const agentId = 'HeroAgent_v17';
    try {
        hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    } catch (e) {
        console.warn('Could not load hero_v17_real_weights.json, using random weights.');
        hw = null;
    }

    const hero = new SACController(11, 3, 64, hw ? new Float64Array(hw) : null);

    console.log(`Evaluating ${agentId}...`);
    const results = await evalService.evaluateAgent(hero, tasks);

    // Register results
    const entry = registry.registerResult(agentId, results);

    console.log('\nBenchmark Results:');
    results.forEach(r => {
        console.log(`- ${r.taskName}: Score ${r.finalScore.toFixed(2)} (Bias: ${r.fingerprint.bias})`);
    });
    console.log(`Overall Performance Index: ${entry.avgScore.toFixed(2)}`);

    // Check health and evolution
    const health = evolution.checkAgentHealth(agentId);
    if (!health.healthy) {
        console.warn(`[ALERT] Health check failed for ${agentId}. Violations: ${health.violations.join(', ')}`);
        // await evolution.triggerEvolution(agentId); // Optional: automated evolution
    } else {
        console.log(`[OK] ${agentId} is operating within healthy parameters.`);
    }

    fs.writeFileSync('benchmark_report.json', JSON.stringify(entry, null, 2));
    console.log('\nReport saved to benchmark_report.json and registered in agent_registry.json');
}

runBenchmark().catch(console.error);
