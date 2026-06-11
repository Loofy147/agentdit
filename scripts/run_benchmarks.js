import { TaskGenerator } from '../src/services/taskGenerator.js';
import { EvaluationService } from '../src/services/evalService.js';
import { SACController } from '../src/engine/sacController.js';
import fs from 'fs';

async function runBenchmark() {
    console.log('--- Agent Performance Evaluation System (v19) ---');

    const generator = new TaskGenerator('./public_market_data.json');
    const tasks = await generator.generateTasks();
    const evalService = new EvaluationService();

    let hw;
    try {
        hw = JSON.parse(fs.readFileSync('./hero_v17_real_weights.json', 'utf8'));
    } catch (e) {
        console.warn('Could not load hero_v17_real_weights.json, using random weights.');
        hw = null;
    }

    const hero = new SACController(17, 3, 64, hw ? new Float64Array(hw) : null);

    console.log('Evaluating HeroAgent (v17 SAC)...');
    const results = await evalService.evaluateAgent(hero, tasks);

    // Bolt Tempo Stress Test
    console.log('\n--- Bolt Tempo Stress Test (10,000 Inferences) ---');
    const state = new Float64Array(17).map(() => Math.random());
    const start = performance.now();
    const latencies = [];
    for (let i = 0; i < 10000; i++) {
        const t0 = performance.now();
        hero.sample(state, true);
        latencies.push(performance.now() - t0);
    }
    const end = performance.now();
    const totalTime = end - start;
    const avgLatency = totalTime / 10000;
    const sorted = latencies.sort((a,b) => a-b);
    const p99 = sorted[Math.floor(latencies.length * 0.99)];

    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Avg Latency: ${avgLatency.toFixed(4)}ms`);
    console.log(`p99 Latency: ${p99.toFixed(4)}ms`);

    const report = {
        agent_id: 'HeroAgent_v17',
        timestamp: new Date().toISOString(),
        overall_score: results.reduce((acc, r) => acc + r.finalScore, 0) / results.length,
        task_results: results,
        stress_test: {
            avg: avgLatency,
            p99: p99,
            total: totalTime
        }
    };

    console.log('\nBenchmark Results:');
    results.forEach(r => {
        console.log(`- ${r.taskName}: Score ${r.finalScore.toFixed(2)} (p99: ${r.latencyStats.p99.toFixed(4)}ms)`);
    });
    console.log(`Overall Performance Index: ${report.overall_score.toFixed(2)}`);

    fs.writeFileSync('benchmark_report.json', JSON.stringify(report, null, 2));
    console.log('\nReport saved to benchmark_report.json');
}

runBenchmark().catch(console.error);
