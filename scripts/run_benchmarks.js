import { TaskGenerator } from '../src/services/taskGenerator.js';
import { EvaluationService } from '../src/services/evalService.js';
import { SACController } from '../src/engine/sacController.js';
import fs from 'fs';

async function runBenchmark() {
    console.log('--- Agent Performance Evaluation System ---');

    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();
    const evalService = new EvaluationService();

    // Load Hero Agent (SAC)
    let hw;
    try {
        hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    } catch (e) {
        console.warn('Could not load hero_v17_real_weights.json, using random weights.');
        hw = null;
    }

    // stateDim=12, actionDim=3
    const hero = new SACController(12, 3, 64, hw ? new Float64Array(hw) : null);

    console.log('Evaluating HeroAgent (v17 SAC)...');
    const results = await evalService.evaluateAgent(hero, tasks);

    const report = {
        agent_id: 'HeroAgent_v17',
        timestamp: new Date().toISOString(),
        overall_score: results.reduce((acc, r) => acc + r.finalScore, 0) / results.length,
        task_results: results
    };

    console.log('\nBenchmark Results:');
    results.forEach(r => {
        console.log(`- ${r.taskName}: Score ${r.finalScore.toFixed(2)}`);
    });
    console.log(`Overall Performance Index: ${report.overall_score.toFixed(2)}`);

    fs.writeFileSync('benchmark_report.json', JSON.stringify(report, null, 2));
    console.log('\nReport saved to benchmark_report.json');
}

runBenchmark().catch(console.error);
