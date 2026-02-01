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
                // Regular Price (Last Close)
                const priceMatch = data.match(/Price<\/td><td[^>]*><b>([\d.]+)<\/b>/i);
                
                // Finviz after-hours price is usually in the 'data' variable in a script tag
                // or sometimes in a specific span if the market is currently in extended hours.
                // Regex for "aftermarket": 190.25 (as found in some raw sources)
                const aftermarketMatch = data.match(/"aftermarket":\s*([\d.]+)/i);
                
                if (aftermarketMatch && parseFloat(aftermarketMatch[1]) > 0) {
                    resolve({
                        price: parseFloat(aftermarketMatch[1]),
                        type: 'extended',
                        regularPrice: priceMatch ? parseFloat(priceMatch[1]) : null
                    });
                } else if (priceMatch) {
                    resolve({
                        price: parseFloat(priceMatch[1]),
                        type: 'regular'
                    });
                } else {
                    // Fallback to simpler search
                    const fallbackMatch = data.match(/"Price","value":"([\d.]+)"/i);
                    if (fallbackMatch) {
                        resolve({ price: parseFloat(fallbackMatch[1]), type: 'regular' });
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
    .then(result => console.log(JSON.stringify({ 
        symbol: symbol.toUpperCase(), 
        ...result,
        timestamp: new Date().toISOString() 
    })))
    .catch(err => {
        console.error(JSON.stringify({ error: err.message, symbol }));
        process.exit(1);
    });
