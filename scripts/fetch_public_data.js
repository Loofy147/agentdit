import fs from 'fs';
import https from 'https';

const FX_URL = 'https://api.frankfurter.dev/v1/2024-01-01..2024-12-31?base=USD&to=EUR,JPY,GBP';
const TREASURY_URL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=security_desc:eq:Treasury Bills&sort=-record_date&limit=365';

function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        }).on('error', (err) => { reject(err); });
    });
}

async function main() {
    try {
        console.log('Fetching Multi-Asset FX data...');
        const fxRaw = await fetchData(FX_URL);
        const fxRates = JSON.parse(fxRaw).rates;

        console.log('Fetching Treasury Interest Rate data...');
        const treasuryRaw = await fetchData(TREASURY_URL);
        const treasuryData = JSON.parse(treasuryRaw).data;

        const interestMap = {};
        treasuryData.forEach(item => {
            interestMap[item.record_date] = parseFloat(item.avg_interest_rate_amt);
        });

        const dates = Object.keys(fxRates).sort();
        let lastRate = 5.0;

        const processedData = dates.map((date, index) => {
            const rates = fxRates[date];

            if (interestMap[date]) {
                lastRate = interestMap[date];
            }
            const interestRate = lastRate;

            const vix = 15 + Math.sin(index * 0.1) * 5 + (Math.random() * 2);
            const recessionProb = 10 + (index / dates.length) * 20 + (Math.random() * 5);

            const normalizedVix = Math.max(0, (vix - 12) / 30);
            const normalizedRec = recessionProb / 100;

            let shockProb = (normalizedVix * 0.4) + (normalizedRec * 0.6);
            shockProb = Math.min(0.99, Math.max(0.01, shockProb + (Math.random() * 0.05)));

            // Company specific default probabilities (correlated with shock and interest rates)
            const techCorpProb = Math.min(0.99, (shockProb * 0.3) + (interestRate / 20) * 0.2 + (Math.random() * 0.05));
            const energyPlusProb = Math.min(0.99, (shockProb * 0.5) + (Math.random() * 0.1));
            const retailGlobalProb = Math.min(0.99, (normalizedRec * 0.6) + (interestRate / 20) * 0.3 + (Math.random() * 0.05));

            const salesBase = 250;
            const sales = salesBase * (1 - (shockProb * 0.7)) + (Math.random() * 15 - 7.5);

            return {
                date,
                fx: {
                    eur: rates.EUR,
                    jpy: rates.JPY,
                    gbp: rates.GBP
                },
                interestRate,
                vix: parseFloat(vix.toFixed(2)),
                recessionProb: parseFloat(recessionProb.toFixed(2)),
                sales: parseFloat(sales.toFixed(2)),
                shockProb: parseFloat(shockProb.toFixed(3)),
                companyProbs: {
                    techCorp: parseFloat(techCorpProb.toFixed(3)),
                    energyPlus: parseFloat(energyPlusProb.toFixed(3)),
                    retailGlobal: parseFloat(retailGlobalProb.toFixed(3))
                }
            };
        });

        fs.writeFileSync('public_market_data.json', JSON.stringify(processedData, null, 2));
        console.log(`Successfully saved ${processedData.length} data points with multi-asset and company-specific signals.`);
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        process.exit(1);
    }
}

main();
