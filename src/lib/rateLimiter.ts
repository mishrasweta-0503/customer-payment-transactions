import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

// Connects to Docker Redis service or localhost
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const RATE_LIMIT_WINDOW_SECS = 10;
const MAX_REQUESTS_PER_WINDOW = 20; // Change to 20 after testing

export async function applyRateLimit(request: NextRequest, endpointName: string) {
  try {
    const identifier = request.headers.get('x-user-id') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitKey = `rate_limit:user:${identifier}:${endpointName}`;

    // Atomic increment across distributed server instances in Docker
    const currentRequests = await redis.incr(rateLimitKey);

    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECS);
    }

    if (currentRequests > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'You are sending requests too quickly. Please slow down.',
          retryAfterSeconds: RATE_LIMIT_WINDOW_SECS,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(RATE_LIMIT_WINDOW_SECS),
          },
        }
      );
    }
  } catch (error) {
    console.error('Redis Rate Limiter Error:', error);
  }

  return null; // Limit not exceeded
}
