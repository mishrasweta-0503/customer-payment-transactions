import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const CACHE_TTL_SECONDS = 5 * 60; // 5 mins primary cache
const STALE_TTL_SECONDS = 24 * 60 * 60; // 24 hours fallback cache
const MAX_CALLS_PER_MIN = 60;

const globalForRequests = globalThis as unknown as {
  inFlightRequests: Map<string, Promise<string>> | undefined;
};
const inFlightRequests =
  globalForRequests.inFlightRequests ?? new Map<string, Promise<string>>();

if (process.env.NODE_ENV !== 'production') {
  globalForRequests.inFlightRequests = inFlightRequests;
}
async function checkProviderRateLimit(): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const rateLimitKey = 'provider_rate_limit:exchange_rate';

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(rateLimitKey, 0, windowStart);
  pipeline.zcard(rateLimitKey);
  pipeline.zadd(rateLimitKey, now, `${now}-${Math.random()}`);
  pipeline.expire(rateLimitKey, 60);

  const results = await pipeline.exec();
  const currentRequestCount = (results?.[1]?.[1] as number) || 0;

  return currentRequestCount < MAX_CALLS_PER_MIN;
}

export async function getExchangeRate(from: string, to: string): Promise<string> {
  const pairKey = `rate:${from.toUpperCase()}_${to.toUpperCase()}`;
  const staleKey = `stale_rate:${from.toUpperCase()}_${to.toUpperCase()}`;
  const cachedRate = await redis.get(pairKey);
  if (cachedRate) {
    console.log(`Cache Hit! Returning cached rate for ${pairKey}: ${cachedRate}`);
    return cachedRate;
  }
  if (inFlightRequests.has(pairKey)) {
    console.log(`Deduplicating fetch request for ${pairKey}`);
    return await inFlightRequests.get(pairKey)!;
  }
  const fetchPromise = (async (): Promise<string> => {
    try {
      const canMakeRequest = await checkProviderRateLimit();
      if (!canMakeRequest) {
        const staleRate = await redis.get(staleKey);
        if (staleRate) {
          console.warn(`Global provider limit hit (60 req/min). Returning stale rate for ${pairKey}: ${staleRate}`);
          return staleRate;
        }
        throw new Error(`Provider rate limit reached (60 req/min). Please try again in a minute.`);
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3001';
      const response = await fetch(`${baseUrl}/external/exchange-rate?from=${from}&to=${to}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`External API request failed with status: ${response.status}`);
      }
      const data = await response.json();
      const rate = String(data.rate);
      await redis.set(pairKey, rate, 'EX', CACHE_TTL_SECONDS);
      await redis.set(staleKey, rate, 'EX', STALE_TTL_SECONDS);

      return rate;
    } catch (error) {
      const staleRate = await redis.get(staleKey);
      if (staleRate) {
        console.warn(`Provider failed. Returning stale rate for ${pairKey}: ${staleRate}`);
        return staleRate;
      }
      throw error;
    } finally {
      inFlightRequests.delete(pairKey);
    }
  })();

  inFlightRequests.set(pairKey, fetchPromise);
  return await fetchPromise;
}