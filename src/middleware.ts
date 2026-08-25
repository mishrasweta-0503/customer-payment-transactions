import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

//a max of 20 requests per client in a 10 sec window
const RATE_LIMIT_WINDOW_SECS = 10;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  //ensuring rate limiting applies only to /api/transactions and /external/exchange-rate
  if (pathname.startsWith('/api/transactions') || pathname.startsWith('/external/exchange-rate')) {
    const identifier = request.headers.get('x-user-id') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitKey = `rate_limit:user:${identifier}:${pathname}`;//to track request counts per user/IP per endpoint independently
    const currentRequests = await redis.incr(rateLimitKey);//atomic counter     

    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW_SECS); //rolling window initialization
    }

    //if requests exceed 20 within the active 10-second window, it halts the request immediately.
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/transactions/:path*', '/external/exchange-rate'],
};
