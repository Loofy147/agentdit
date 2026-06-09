import fs from 'fs';
import https from 'https';

const API_URL = 'https://api.frankfurter.dev/v1/2024-01-01..2024-12-31?to=USD';

function fetchData() {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('Fetching FX data from Frankfurter...');
        const response = await fetchData();
        const rates = response.rates;
        const dates = Object.keys(rates).sort();

        const processedData = dates.map((date, index) => {
            const fxRate = rates[date].USD;
            let shockProb = 0.02; // Base shock prob

            if (index > 0) {
                const prevRate = rates[dates[index - 1]].USD;
                const change = Math.abs(fxRate - prevRate) / prevRate;
                shockProb = Math.min(0.99, 0.02 + (change * 50)); // Scale volatility to shock prob
            }

            // Synthesize sales: higher sales when FX is stable, lower when volatile
            const sales = 250 * (1 - (shockProb * 0.5)) + (Math.random() * 20 - 10);

            return {
                date,
                fxRate,
                sales: parseFloat(sales.toFixed(2)),
                shockProb: parseFloat(shockProb.toFixed(3))
            };
        });

        fs.writeFileSync('public_market_data.json', JSON.stringify(processedData, null, 2));
        console.log(`Successfully saved ${processedData.length} data points to public_market_data.json`);
    } catch (error) {
        console.error('Error fetching or processing data:', error);
        process.exit(1);
    }
}

main();
