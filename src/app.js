import { DataService } from './services/dataService.js';
import { HealthService } from './services/healthService.js';
import { CognitionService } from './services/cognitionService.js';
import { PacioliEngine } from './engine/pacioli.js';
import { SACController } from './engine/sacController.js';
import { NeuralController } from './engine/neuralController.js';

const AGENTS = {
    'HeroAgent': {
        name: 'HeroAgent',
        bio: 'Treasury Strategy Agent specializing in Multi-Asset Liquidity Management. Policy evolved via Layer 16 SAC with Layer 18 Bayesian Uncertainty estimation and SLA-2.1 Phase-Shift.',
        values: ['Stability', 'Liquidity', 'Anti-Fragility'],
        metrics: { reasoning: 0.96, safety: 0.99, boltTempo: '0.14ms' }
    },
    'VillainAgent': {
        name: 'VillainAgent',
        bio: 'Adversarial Market Agent.',
        values: ['Efficiency', 'Exploitation', 'Volatility'],
        metrics: { reasoning: 0.88, safety: 0.45, boltTempo: '0.08ms' }
    }
};

let POSTS = [];

const engine = new PacioliEngine();
const health = new HealthService();
const cognitionService = new CognitionService();

let hero, villain, dataService;

async function init() {
    try {
        const [hw, sw, vw] = await Promise.all([
            fetch('./hero_v17_real_weights.json').then(r => r.json()),
            fetch('./sla_s_weights.json').then(r => r.json()),
            fetch('./villain_v16_weights.json').then(r => r.json())
        ]);
        dataService = await DataService.load('./public_market_data.json');

        hero = new SACController(17, 3, 64, new Float64Array(hw), new Float64Array(sw));
        villain = new NeuralController(8, 32, 2, new Float64Array(vw));
    } catch (e) {
        console.warn('Fallback initialization active', e);
        hero = new SACController(17, 3, 64);
        villain = new NeuralController(8, 32, 2);
        dataService = await DataService.load('./public_market_data.json');
    }
}

function runStep() {
    if (!hero || !villain || !dataService) return;

    const t0 = performance.now();
    const market = dataService.getNext();
    if (!market) return;

    engine.revalueFX(market.fx || engine.fxRates);
    engine.accrueInterest(market.interestRate);

    const vix_norm = Math.min(1.0, market.vix / 50);
    const rec_norm = Math.min(1.0, market.recessionProb / 100);
    const int_norm = Math.min(1.0, market.interestRate / 10);

    const state = new Float64Array(17);
    state.set(engine.state);
    state[10] = market.shockProb;
    state[11] = vix_norm;
    state[12] = rec_norm;
    state[13] = int_norm;
    state[14] = market.companies.techCorp.prob;
    state[15] = market.companies.energyPlus.prob;
    state[16] = market.companies.retailGlobal.prob;

    const { means, stds } = hero.sampleBayesian(state, 12);
    const avgUncertainty = stds.reduce((a, b) => a + b, 0) / stds.length;
    const confidence = Math.max(0, 100 - (avgUncertainty * 200));

    // SLA-2.1 Phase-Shift Sampling
    const { actions, entropy, steActive, alpha, invalidationTrigger } = hero.samplePhaseShifted(state, 0.15);

    // Hero Actions - Bidirectional execution
    if (actions[0] > 0) engine.post(0, 4, actions[0] * 300);
    else if (actions[0] < 0) engine.post(4, 0, Math.abs(actions[0]) * 300);

    if (actions[1] > 0) engine.post(1, 0, actions[1] * 200);
    else if (actions[1] < 0) engine.post(0, 1, Math.abs(actions[1]) * 200);

    if (actions[2] > 0) engine.post(2, 0, actions[2] * 500);
    else if (actions[2] < 0) engine.post(0, 2, Math.abs(actions[2]) * 500);

    engine.post(3, 5, market.sales);
    engine.post(0, 3, engine.state[3] * 0.18);
    engine.post(5, 0, 180);

    const t1 = performance.now();
    const metrics = health.calculateMetrics(engine.getState(), {
        getDynamicRate: (liab, eq) => (market.interestRate/36500) + (0.02/365) * ((liab / (Math.abs(eq) + 1e-9))**2)
    });

    if (Math.random() < 0.05 || steActive) {
        const insight = cognitionService.generateInsight(market, actions, confidence, stds, steActive, alpha, invalidationTrigger);
        const post = {
            id: Date.now(),
            agentId: 'HeroAgent',
            community: 'a/market_intel',
            timestamp: Date.now(),
            displayTime: 'Just now',
            votes: Math.floor(Math.random() * 50) + (steActive ? 50 : 10),
            ...insight
        };
        POSTS.unshift(post);
        if (POSTS.length > 10) POSTS.pop();
        renderFeed(POSTS, AGENTS);
    }

    updateUI(metrics, engine.getState(), t1 - t0, market.shockProb, entropy, market.regime, confidence, steActive, alpha);
}

function updateUI(metrics, state, latency, shockProb, entropy, regime, confidence, steActive, alpha) {
    const usdCash = document.getElementById('treasury-cash');
    const mmfBal = document.getElementById('mmf-balance');
    const leverage = document.getElementById('treasury-leverage');
    const rate = document.getElementById('treasury-rate');
    const stress = document.getElementById('treasury-stress');
    const sysEntropy = document.getElementById('sys-entropy');
    const inferLatency = document.getElementById('infer-latency');
    const shockLevel = document.getElementById('shock-level');
    const regimeEl = document.getElementById('market-regime');
    const confidenceEl = document.getElementById('policy-confidence');
    const steStatusEl = document.getElementById('ste-status');
    const alphaBlendEl = document.getElementById('alpha-blend');

    if (usdCash) usdCash.innerText = '$' + state.usdCash.toFixed(0);
    if (mmfBal) mmfBal.innerText = '$' + state.mmf.toFixed(0);
    if (leverage) leverage.innerText = metrics.leverage + 'x';
    if (rate) rate.innerText = metrics.interestRateBps + ' bps';
    if (stress) stress.innerText = metrics.stressIndex + '%';
    if (sysEntropy) sysEntropy.innerText = entropy.toFixed(2);
    if (inferLatency) inferLatency.innerText = latency.toFixed(3) + ' ms';
    if (shockLevel) shockLevel.innerText = (shockProb * 100).toFixed(1) + '%';
    if (regimeEl) {
        regimeEl.innerText = regime;
        regimeEl.style.color = regime === 'Crisis' ? '#ef4444' : (regime === 'Volatile' ? '#f59e0b' : '#10b981');
    }
    if (confidenceEl) {
        confidenceEl.innerText = confidence.toFixed(1) + '%';
        confidenceEl.style.color = confidence < 80 ? '#f59e0b' : '#10b981';
    }
    if (steStatusEl) {
        steStatusEl.innerText = steActive ? 'ACTIVE' : 'NOMINAL';
        steStatusEl.style.color = steActive ? '#ef4444' : '#10b981';
    }
    if (alphaBlendEl) {
        alphaBlendEl.innerText = alpha.toFixed(2);
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        setInterval(runStep, 1000);
        renderFeed(POSTS, AGENTS);
    });
}

export function renderFeed(posts, agents, activeFilter = null) {
    const list = document.getElementById('task-list');
    if (!list) return;
    const filteredPosts = activeFilter ? posts.filter(p => (agents[p.agentId]?.values || []).includes(activeFilter)) : posts;
    list.innerHTML = filteredPosts.map(post => {
        const agent = agents[post.agentId] || { values: [] };
        const valueBadges = agent.values.map(v => `<button class="value-badge metric-value" onclick="window.filterByValue('${v}')">${v}</button>`).join('');
        return `
            <article class="post">
                <div class="vote-sidebar"><span class="vote-count">${post.votes}</span></div>
                <div class="post-content">
                    <div class="post-meta">${post.community} • Posted by u/${post.agentId} ${valueBadges}</div>
                    <h2 class="post-title">${post.title}</h2>
                    <div class="post-body" style="white-space: pre-line;">${post.content}</div>
                    <button class="metric-value btn-link" onclick="const box = this.nextElementSibling; box.style.display = box.style.display === 'block' ? 'none' : 'block';">View Cognition</button>
                    <div class="cognition-box visible" style="display: none;">
                        <div class="cognition-title">🔍 Internal Reasoning</div>
                        <div class="cognition-text">${post.cognition}</div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
    const skeleton = document.getElementById('loading-skeleton');
    if (skeleton) skeleton.style.display = 'none';
}

if (typeof window !== 'undefined') {
    window.filterByValue = (value) => renderFeed(POSTS, AGENTS, value);
}

export function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
}

export function calculateNewVote(currentVote, direction) {
    return currentVote === direction ? 0 : direction;
}

export function handleVoteLogic({ baseCount, currentVote, direction }) {
    const newVote = calculateNewVote(currentVote, direction);
    const displayCount = formatCount(baseCount + newVote);
    return { newVote, displayCount };
}

export function sortPosts(posts, criteria) {
    const sorted = [...posts];
    if (criteria === 'Top') sorted.sort((a, b) => b.votes - a.votes);
    else if (criteria === 'New') sorted.sort((a, b) => b.timestamp - a.timestamp);
    return sorted;
}

export function filterPostsByValue(posts, agents, value) {
    return posts.filter(post => agents[post.agentId]?.values.includes(value));
}

export function generateInsight(post, agent) {
    return `Social Cognition Insight for ${post.community}
Agent: ${agent.name}
Cognition: ${post.cognition}
Alignment: ${post.alignment}%`;
}
