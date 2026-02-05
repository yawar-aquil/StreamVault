
import fetch from 'node-fetch';

let rateCache: {
    rates: Record<string, number>;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function getExchangeRates(base = 'USD'): Promise<Record<string, number>> {
    const now = Date.now();

    // Return cached rates if valid
    if (rateCache && (now - rateCache.timestamp < CACHE_DURATION)) {
        return rateCache.rates;
    }

    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
        const data = await res.json() as any;

        if (data && data.rates) {
            rateCache = {
                rates: data.rates,
                timestamp: now
            };
            return data.rates;
        }
        throw new Error("Invalid rate data");
    } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        // Fallback if API fails (could use stale cache or defaults)
        if (rateCache) return rateCache.rates;
        return { USD: 1, INR: 85, EUR: 0.92, GBP: 0.78 }; // Hard fallback
    }
}

export async function convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const rates = await getExchangeRates('USD'); // Base is USD
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;

    // Convert to USD first, then to target
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
}
