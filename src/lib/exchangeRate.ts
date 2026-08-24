//the purpose here is to avoid unnecessary repeated provider calls while ensuring that exchange rates are not kept indefinitely

interface CacheEntry{
    rate: string;
    expiresAt: number;
}

const globalForCache = globalThis as unknown as {
    rateCache: Map<string, CacheEntry> | undefined;
  };

const rateCache = globalForCache.rateCache ?? new Map<string, CacheEntry>();
if (process.env.NODE_ENV !== 'production') globalForCache.rateCache = rateCache;

const CACHE_TTL_MS = 5 * 60 * 1000; //cache duration is 5 mins

export async function getExchangeRate(from: string, to: string): Promise<string> {
    const pair_key = `${from.toUpperCase()}_${to.toUpperCase()}` //lookup key
    const now = Date.now();
    const cached = rateCache.get(pair_key);
    if(cached && cached.expiresAt > now){
        console.log(`Cache Hit! Returning cached rate for ${pair_key}: ${cached.rate}`);
        return cached.rate;
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3001' || 'http://127.0.0.1:3000';
    try {
        const response = await fetch(`${baseUrl}/external/exchange-rate?from=${from}&to=${to}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('External API request failed')
        };
        const data = await response.json();
        const rate = data.rate;
        rateCache.set(pair_key, {rate,expiresAt: now + CACHE_TTL_MS});
        return rate;
    } catch (error) {
        //if external api fails or times out, an expired cached entry is returned instead of throwing a new error.
        //this handles temporarily unavailable responses
        if (cached) {
            console.warn(`Returning stale rate for ${pair_key}: ${cached.rate}`);
            return cached.rate;
        }
        throw new Error(`Unable to fetch exchange rate for ${from} to ${to}`);
    }
}