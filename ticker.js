const https = require('https');

async function getPrice(symbol) {
    return new Promise((resolve, reject) => {
        // Using Finviz for cleaner scraping
        const url = `https://finviz.com/quote.ashx?t=${symbol}`;
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status Code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                // Finviz stores price in a table cell usually next to the text "Price"
                // Extracting it from the text content
                const priceMatch = data.match(/Price<\/td><td[^>]*><b>([\d.]+)<\/b>/i);
                if (priceMatch) {
                    resolve(parseFloat(priceMatch[1]));
                } else {
                    // Fallback to simpler search in case of layout changes
                    const fallbackMatch = data.match(/"Price","value":"([\d.]+)"/i);
                    if (fallbackMatch) {
                        resolve(parseFloat(fallbackMatch[1]));
                    } else {
                        reject(new Error(`Could not find price for ${symbol}`));
                    }
                }
            });
        }).on('error', reject);
    });
}

const symbol = process.argv[2] || 'AAPL';
getPrice(symbol.toUpperCase())
    .then(price => console.log(JSON.stringify({ symbol: symbol.toUpperCase(), price, timestamp: new Date().toISOString() })))
    .catch(err => {
        console.error(JSON.stringify({ error: err.message, symbol }));
        process.exit(1);
    });
