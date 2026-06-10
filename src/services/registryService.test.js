import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RegistryService } from './registryService.js';
import fs from 'fs';

describe('RegistryService', () => {
    const testPath = './test_registry.json';

    beforeEach(() => {
        if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    });

    afterEach(() => {
        if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    });

    it('should register results and calculate profile', () => {
        const registry = new RegistryService(testPath);
        const results = [
            {
                finalScore: 0.8,
                breakdown: { taskSuccess: 0.9, reasoning: 0.7, toolUse: 1.0, planning: 0.8, efficiency: 1.0, robustness: 0.5, safety: 1.0 },
                fingerprint: { bias: 'Balanced' }
            }
        ];

        registry.registerResult('agent_test', results);
        const agentData = registry.getAgentProfile('agent_test');

        expect(agentData).not.toBeNull();
        expect(agentData.currentProfile.avgScore).toBe(0.8);
        expect(agentData.currentProfile.metrics.taskSuccess).toBe(0.9);
        expect(agentData.currentProfile.fingerprint.bias).toBe('Balanced');
    });
});
