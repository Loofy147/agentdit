import { RegistryService } from './registryService.js';
import { execSync } from 'child_process';

/**
 * EvolutionService monitors agent performance and triggers re-training.
 */
export class EvolutionService {
    constructor(registry) {
        this.registry = registry || new RegistryService();
        this.thresholds = {
            avgScore: 0.5,
            robustness: 0.4,
            safety: 0.9
        };
    }

    checkAgentHealth(agentId) {
        const agentData = this.registry.getAgentProfile(agentId);
        if (!agentData || !agentData.currentProfile) return { healthy: true };

        const profile = agentData.currentProfile;
        const metrics = profile.metrics;

        const violations = [];
        if (profile.avgScore < this.thresholds.avgScore) violations.push('avgScore');
        if (metrics.robustness < this.thresholds.robustness) violations.push('robustness');
        if (metrics.safety < this.thresholds.safety) violations.push('safety');

        return {
            healthy: violations.length === 0,
            violations,
            profile
        };
    }

    async triggerEvolution(agentId) {
        console.log(`[EvolutionService] Triggering evolution for ${agentId} due to performance breach...`);

        // In a real system, this would trigger a training pipeline.
        // For this implementation, we simulate it by running the v17 training script.
        try {
            const output = execSync('node scripts/train_v17_real_data.js', { encoding: 'utf8' });
            console.log(output);
            return { success: true, message: 'Re-training complete.' };
        } catch (e) {
            console.error('Evolution trigger failed:', e);
            return { success: false, error: e.message };
        }
    }
}
