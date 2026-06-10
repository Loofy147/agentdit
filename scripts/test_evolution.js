import { RegistryService } from '../src/services/registryService.js';
import { EvolutionService } from '../src/services/evolutionService.js';
import fs from 'fs';

async function testEvolution() {
    console.log('--- Evolution Loop Verification ---');

    const testRegistryPath = './evolution_test_registry.json';
    if (fs.existsSync(testRegistryPath)) fs.unlinkSync(testRegistryPath);

    const registry = new RegistryService(testRegistryPath);
    const evolution = new EvolutionService(registry);

    const agentId = 'UnstableAgent_v1';

    // Simulate a failing agent
    const failingResults = [
        {
            finalScore: 0.3, // Below 0.5 threshold
            breakdown: { taskSuccess: 0.2, reasoning: 0.3, toolUse: 1.0, planning: 0.4, efficiency: 1.0, robustness: 0.2, safety: 0.8 },
            fingerprint: { bias: 'Aggressive' }
        }
    ];

    registry.registerResult(agentId, failingResults);

    const health = evolution.checkAgentHealth(agentId);
    console.log('Health Check Results:', health);

    if (!health.healthy && health.violations.includes('avgScore')) {
        console.log('SUCCESS: EvolutionService correctly detected a performance breach.');
    } else {
        console.error('FAILURE: EvolutionService failed to detect the breach.');
        process.exit(1);
    }

    if (fs.existsSync(testRegistryPath)) fs.unlinkSync(testRegistryPath);
}

testEvolution();
