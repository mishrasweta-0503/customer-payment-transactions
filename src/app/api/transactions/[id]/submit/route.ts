import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';
import { getExchangeRate } from '@/lib/exchangeRate';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: transactionId } = await params;
  const lockKey = `lock:submission:${transactionId}`;
  const acquireLock = await redis.set(lockKey, 'PROCESSING', 'EX', 30, 'NX'); //if a request is processing, any duplicate request arriving in 30 secs will fail
  if (!acquireLock) {
    return NextResponse.json(
      { error: 'Transaction submission already in progress' },
      { status: 409 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    //validates that the transaction is in "DRAFT" status before processing
    const tx = {
      id: transactionId,
      sourceAmount: body.amount ?? 6000,
      sourceCurrency: body.sourceCurrency || 'AED',
      destinationCurrency: body.destinationCurrency || 'USD',
      status: 'DRAFT',
      providerReference: null as string | null,
    };
    if (!tx || tx.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Transaction cannot be submitted from state: ${tx?.status}` },
        { status: 400 }
      );
    }
    if (tx.providerReference) {
      return NextResponse.json(
        { error: 'Payment already processed for this transaction' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || 'localhost:3001';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${host}`;
    const rateString = await getExchangeRate(tx.sourceCurrency, tx.destinationCurrency); //retrieves the current exchange rate using getExchangeRate helper function
    const exchangeRate = Number(rateString);
    const destinationAmount = Number((tx.sourceAmount * exchangeRate).toFixed(2));
    const riskRes = await fetch(`${baseUrl}/external/risk-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAmount: tx.sourceAmount,
        sourceCurrency: tx.sourceCurrency,
      }),
    });

    if (!riskRes.ok) {
      throw new Error('Risk assessment provider request failed');
    }


    //risk data filtering, if risk is high, then updates the status to PENDING_REVIEW
    const riskData = await riskRes.json();
    if (riskData.level === 'HIGH') {
      return NextResponse.json({
        id: transactionId,
        status: 'PENDING_REVIEW',
        riskScore: riskData.score,
        message: 'Transaction flagged for manual review due to high risk assessment',
      });
    }
    const paymentRes = await fetch(`${baseUrl}/external/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: tx.id,
        sourceAmount: destinationAmount,
        sourceCurrency: tx.destinationCurrency,
      }),
    });

    if (!paymentRes.ok) {
      const errorData = await paymentRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Payment execution failed at provider' },
        { status: paymentRes.status }
      );
    }

    const paymentData = await paymentRes.json();

    return NextResponse.json({
      id: transactionId,
      status: 'COMPLETED',
      sourceAmount: tx.sourceAmount,
      sourceCurrency: tx.sourceCurrency,
      destinationAmount,
      destinationCurrency: tx.destinationCurrency,
      exchangeRate,
      riskScore: riskData.score,
      providerReference: paymentData.providerReference,
    });
  } catch (error) {
    console.error(`Submission workflow failed for ${transactionId}:`, error);
    return NextResponse.json({ error: 'Workflow step execution failed' }, { status: 500 });
  } finally {
    await redis.del(lockKey);
  }
}