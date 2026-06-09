import fs from 'fs';
import https from 'https';

const FX_URL = 'https://api.frankfurter.dev/v1/2024-01-01..2024-12-31?to=USD';

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
        console.log('Fetching FX data...');
        const fxRaw = await fetchData(FX_URL);
        const fxRates = JSON.parse(fxRaw).rates;

        // Mocking VIX and Recession Probabilities due to FRED connection issues in this env
        const dates = Object.keys(fxRates).sort();
        const processedData = dates.map((date, index) => {
            const fxRate = fxRates[date].USD;

            // Generate synthetic but realistic VIX (mean-reverting)
            const vix = 15 + Math.sin(index * 0.1) * 5 + (Math.random() * 2);
            // Generate synthetic Recession Prob (trending)
            const recessionProb = 10 + (index / dates.length) * 20 + (Math.random() * 5);

            const normalizedVix = Math.max(0, (vix - 12) / 30);
            const normalizedRec = recessionProb / 100;

            let shockProb = (normalizedVix * 0.4) + (normalizedRec * 0.6);
            shockProb = Math.min(0.99, Math.max(0.01, shockProb + (Math.random() * 0.05)));

            const salesBase = 250;
            const sales = salesBase * (1 - (shockProb * 0.7)) + (Math.random() * 15 - 7.5);

            return {
                date,
                fxRate,
                vix: parseFloat(vix.toFixed(2)),
                recessionProb: parseFloat(recessionProb.toFixed(2)),
                sales: parseFloat(sales.toFixed(2)),
                shockProb: parseFloat(shockProb.toFixed(3))
            };
        });

        fs.writeFileSync('public_market_data.json', JSON.stringify(processedData, null, 2));
        console.log(`Successfully saved ${processedData.length} data points with synthetic market signals.`);
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        process.exit(1);
    }
}

main();
