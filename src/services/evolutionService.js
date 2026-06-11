import { RegistryService } from './registryService.js';
import { execSync } from 'child_process';

/**
 * EvolutionService monitors agent performance and triggers re-training.
 * Upgraded with Pareto-Optimal selection logic for Score vs. Efficiency.
 */
export class EvolutionService {
    constructor(registry) {
        this.registry = registry || new RegistryService();
        this.thresholds = {
            avgScore: 0.5,
            robustness: 0.4,
            safety: 0.9,
            efficiency: 0.9 // Bolt Tempo mandate
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
        if (metrics.efficiency < this.thresholds.efficiency) violations.push('efficiency');

        return {
            healthy: violations.length === 0,
            violations,
            profile
        };
    }

    /**
     * Identifies if an agent is dominated by others in the registry.
     * (A dominated agent is worse in all objectives: Score and Efficiency).
     */
    isDominated(agentId) {
        const profiles = this.registry.getAllProfiles?.() || [];
        const subject = profiles.find(p => p.id === agentId);
        if (!subject) return false;

        return profiles.some(p =>
            p.id !== agentId &&
            p.avgScore >= subject.avgScore &&
            p.metrics.efficiency >= subject.metrics.efficiency &&
            (p.avgScore > subject.avgScore || p.metrics.efficiency > subject.metrics.efficiency)
        );
    }

    async triggerEvolution(agentId) {
        if (!this.checkAgentHealth(agentId).healthy || this.isDominated(agentId)) {
            console.log(`[EvolutionService] Triggering evolution for ${agentId}...`);
            try {
                const output = execSync('node scripts/train_v17_real_data.js', { encoding: 'utf8' });
                return { success: true, message: 'Re-training complete.' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, message: 'Agent is healthy and non-dominated.' };
    }
}
