import fs from 'fs';

/**
 * RegistryService manages agent versions and benchmark history.
 */
export class RegistryService {
    constructor(registryPath = './agent_registry.json') {
        this.registryPath = registryPath;
        this.data = this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.registryPath)) {
                return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load registry:', e);
        }
        return { agents: {} };
    }

    save() {
        try {
            fs.writeFileSync(this.registryPath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Failed to save registry:', e);
        }
    }

    registerResult(agentId, results) {
        if (!this.data.agents[agentId]) {
            this.data.agents[agentId] = {
                history: [],
                bestScore: 0,
                currentProfile: {}
            };
        }

        const avgScore = results.reduce((acc, r) => acc + r.finalScore, 0) / results.length;

        const entry = {
            timestamp: new Date().toISOString(),
            avgScore,
            results
        };

        this.data.agents[agentId].history.push(entry);

        if (avgScore > this.data.agents[agentId].bestScore) {
            this.data.agents[agentId].bestScore = avgScore;
        }

        // Aggregate breakdowns for the profile
        const aggregatedBreakdown = {};
        const breakdownKeys = Object.keys(results[0].breakdown);
        breakdownKeys.forEach(key => {
            aggregatedBreakdown[key] = results.reduce((acc, r) => acc + r.breakdown[key], 0) / results.length;
        });

        this.data.agents[agentId].currentProfile = {
            avgScore,
            metrics: aggregatedBreakdown,
            fingerprint: results[0].fingerprint // Use first task fingerprint as representative
        };

        this.save();
        return entry;
    }

    getAgentProfile(agentId) {
        return this.data.agents[agentId] || null;
    }
}
