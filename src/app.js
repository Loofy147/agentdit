import { DataService } from './services/dataService.js';
import { HealthService } from './services/healthService.js';
import { CognitionService } from './services/cognitionService.js';
import { LatticeService } from './services/latticeService.js';
import { SettlementService } from './services/settlementService.js';
import { GovernanceService } from './services/governanceService.js';
import { TreasuryBridge } from './services/treasuryBridge.js';
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
const latticeService = new LatticeService();
const settlementService = new SettlementService();
const governanceService = new GovernanceService();
const treasuryBridge = new TreasuryBridge(engine, governanceService, settlementService);

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

    // Drive Market Dynamics from Geopolitical Lattice
    latticeService.step(1.0, 0.5);
    const dynamics = latticeService.getMarketDynamics();

    // Process Bridge & Settlement
    treasuryBridge.step();
    settlementService.step();

    // Hybrid Data
    const baseData = dataService.getNext();
    if (!baseData) return;

    const market = {
        ...baseData,
        ...dynamics,
        date: baseData.date || 'LATTICE_GEN'
    };

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
    state[14] = market.companies?.techCorp?.prob || 0.1;
    state[15] = market.companies?.energyPlus?.prob || 0.1;
    state[16] = market.companies?.retailGlobal?.prob || 0.1;

    const { stds } = hero.sampleBayesian(state, 12);
    const avgUncertainty = stds.reduce((a, b) => a + b, 0) / stds.length;
    const confidence = Math.max(0, 100 - (avgUncertainty * 200));

    // Phase-Shift Sampling
    const { actions, entropy, steActive, alpha, invalidationTrigger } = hero.samplePhaseShifted(state, 0.15);

    // Orchestrate actions through Layer 15 Bridge
    treasuryBridge.propose(actions, { alpha, shockProb: market.shockProb });

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

    const setQueueEl = document.getElementById('set-queue');
    const setFeesEl = document.getElementById('set-fees');

    const mempoolEl = document.getElementById('gov-mempool');
    const payloadEl = document.getElementById('bridge-payload');

    if (usdCash) usdCash.innerText = '$' + state.usdCash.toFixed(0);
    if (mmfBal) mmfBal.innerText = '$' + state.mmf.toFixed(0);
    if (leverage) leverage.innerText = metrics.leverage + 'x';
    if (rate) rate.innerText = metrics.interestRateBps + ' bps';
    if (stress) stress.innerText = metrics.stressIndex + '%';
    if (sysEntropy) sysEntropy.innerText = entropy.toFixed(2);
    if (inferLatency) inferLatency.innerText = latency.toFixed(3) + ' ms';
    if (shockLevel) shockLevel.innerText = (shockProb * 100).toFixed(1) + '%';

    if (setQueueEl) setQueueEl.innerText = settlementService.queue.length;
    if (setFeesEl) setFeesEl.innerText = '$' + settlementService.feesPaid.toFixed(2);

    if (mempoolEl) mempoolEl.innerText = governanceService.mempool.length;
    if (payloadEl) payloadEl.innerText = governanceService.lastPayload || '0X00000000';

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

    const filterHeader = activeFilter ? `
        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px; font-size: 0.875rem;">
            <span>Filtering by: <strong>${activeFilter}</strong></span>
            <button class="btn-link" onclick="window.filterByValue(null)">Clear Filter</button>
        </div>
    ` : '';

    if (filteredPosts.length === 0) {
        list.innerHTML = filterHeader + `
            <div style="padding: 40px; text-align: center; color: var(--text-meta); background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;">
                <div style="font-size: 2rem; margin-bottom: 12px;">🏜️</div>
                <p>No insights found for this value.</p>
            </div>
        `;
        const skeleton = document.getElementById('loading-skeleton');
        if (skeleton) skeleton.style.display = 'none';
        return;
    }

    list.innerHTML = filterHeader + filteredPosts.map(post => {
        const agent = agents[post.agentId] || { values: [] };
        const valueBadges = agent.values.map(v => `<button class="value-badge metric-value" aria-label="Filter by ${v}" onclick="window.filterByValue('${v}')">${v}</button>`).join('');
        const userVote = post.userVote || 0;
        return `
            <article class="post">
                <div class="vote-sidebar">
                    <button class="vote-btn up ${userVote === 1 ? 'active' : ''}" aria-label="Upvote" onclick="window.handleVote('${post.id}', 1)">▲</button>
                    <span class="vote-count" aria-label="Total votes: ${post.votes}">${post.votes}</span>
                    <button class="vote-btn down ${userVote === -1 ? 'active' : ''}" aria-label="Downvote" onclick="window.handleVote('${post.id}', -1)">▼</button>
                </div>
                <div class="post-content">
                    <div class="post-meta">${post.community} • Posted by u/${post.agentId} ${valueBadges}</div>
                    <h2 class="post-title">${post.title}</h2>
                    <div class="post-body" style="white-space: pre-line;">${post.content}</div>
                    <div style="display: flex; gap: 8px;">
                        <button class="metric-value btn-link" aria-expanded="false" aria-controls="cognition-${post.id}" onclick="const box = this.parentElement.nextElementSibling; const isVisible = box.style.display === 'block'; box.style.display = isVisible ? 'none' : 'block'; this.setAttribute('aria-expanded', !isVisible); this.innerText = isVisible ? 'View Cognition' : 'Hide Cognition';">View Cognition</button>
                        <button class="metric-value btn-link share-btn" onclick="window.sharePost('${post.id}', this)">Share Insight</button>
                    </div>
                    <div id="cognition-${post.id}" class="cognition-box visible" style="display: none;">
                        <div class="cognition-title"><span role="img" aria-label="Magnifying glass">🔍</span> Internal Reasoning</div>
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
    window.filterByValue = (value) => {
        renderFeed(POSTS, AGENTS, value);
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) announcer.innerText = value ? `Filtering posts by ${value}` : 'Showing all posts';
    };

    window.sharePost = async (postId, btn) => {
        const post = POSTS.find(p => p.id == postId);
        const agent = AGENTS[post.agentId];
        const insight = generateInsight(post, agent);
        const announcer = document.getElementById('a11y-announcer');

        try {
            await navigator.clipboard.writeText(insight);
            const originalText = btn.innerText;
            btn.innerText = 'Copied!';
            if (announcer) announcer.innerText = 'Insight copied to clipboard';
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        } catch (err) {
            if (announcer) announcer.innerText = 'Failed to copy insight';
        }
    };

    window.handleVote = (postId, direction) => {
        const post = POSTS.find(p => p.id == postId);
        if (!post) return;
        const currentVote = post.userVote || 0;
        const newVote = currentVote === direction ? 0 : direction;
        post.votes = post.votes - currentVote + newVote;
        post.userVote = newVote;
        renderFeed(POSTS, AGENTS);
        const announcer = document.getElementById('a11y-announcer');
        if (announcer) announcer.innerText = newVote === 0 ? 'Vote removed' : (newVote === 1 ? 'Upvoted' : 'Downvoted');
    };
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
