import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, sourceAmount, sourceCurrency } = body;

    if (!transactionId) {
      return NextResponse.json({ error: 'Required transaction Id' }, { status: 400 });
    }

    const lockKey = `payment:processed:${transactionId}`;
    const isFirstAttempt = await redis.set(lockKey, 'PROCESSING', 'EX', 86400, 'NX');

    if (!isFirstAttempt) {
      return NextResponse.json(
        { error: 'Duplicate payment request detected for this transaction' },
        { status: 409 }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const providerReference = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    return NextResponse.json({
      providerReference,
      status: 'ACCEPTED',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process payment request' }, { status: 500 });
  }
}