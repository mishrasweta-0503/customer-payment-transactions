import { NextRequest, NextResponse } from 'next/server';
import { getExchangeRate } from '@/lib/exchangeRate';

//store to block concurrent requests for the same transactionID
const globalForLocks = globalThis as unknown as {
    activeSubmissions: Set<string> | undefined;
};
  
const activeSubmissions = globalForLocks.activeSubmissions ?? new Set<string>();
if (process.env.NODE_ENV !== 'production') {
    globalForLocks.activeSubmissions = activeSubmissions
};

export async function POST(request: NextRequest, { params }: { params: { id: string } } ){
    const { id: transactionId } = await params;
    //restrict simultaneous requests for the same transaction id
    if (activeSubmissions.has(transactionId)) {
        return NextResponse.json({ error: 'Transaction submission already in progress' },{ status: 409 });
    }

    activeSubmissions.add(transactionId); //else add

    try {
        const body = await request.json().catch(() => ({}));
        const tx = {
            id: transactionId,
            amount: body.amount ?? 6000, // <-- Uses Postman amount or falls back to 6000
            sourceCurrency: body.sourceCurrency || 'AED',
            destinationCurrency: body.destinationCurrency || 'USD',
            status: 'DRAFT',
            providerReference: null as string | null,
        };
        if (!tx || tx.status !== 'DRAFT') {
            return NextResponse.json({ error: `Transaction cannot be submitted from state: ${tx?.status}` },{ status: 400 });
        }
        if (tx.providerReference) {
            return NextResponse.json({ error: 'Payment already processed for this transaction' },{ status: 400 });
        }
        const host = request.headers.get('host') || 'localhost:3001';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${host}`;
        const rateString = await getExchangeRate(tx.sourceCurrency, tx.destinationCurrency);
        const exchangeRate = Number(rateString);
        const destinationAmount = Number((tx.amount * exchangeRate).toFixed(2));
        const riskRes = await fetch(`${baseUrl}/external/risk-assessment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: tx.amount, currency: tx.sourceCurrency }),
          });
        if (!riskRes.ok) {
            throw new Error('Risk assessment provider request failed');
        }
        const riskData = await riskRes.json();
        if (riskData.level === 'HIGH') {
            //update db record status to 'PENDING_REVIEW' and save risk score
            return NextResponse.json({id: transactionId,
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
              amount: destinationAmount,
              currency: tx.destinationCurrency,
            }),
        });
        if (!paymentRes.ok) {
            const errorData = await paymentRes.json().catch(() => ({}));
            //update db record status to 'FAILED'
            return NextResponse.json(
              { error: errorData.error || 'Payment execution failed at provider' },
              { status: paymentRes.status }
            );
        }
        const paymentData = await paymentRes.json();
        return NextResponse.json({
            id: transactionId,
            status: 'COMPLETED',
            sourceAmount: tx.amount,
            sourceCurrency: tx.sourceCurrency,
            destinationAmount,
            destinationCurrency: tx.destinationCurrency,
            exchangeRate,
            riskScore: riskData.score,
            providerReference: paymentData.providerReference,
          });
    } catch (error) {
        console.error(`Submission workflow failed for ${transactionId}:`, error);
        return NextResponse.json({error: 'Workflow step execution failed'},{ status: 500 });
    } finally{
        activeSubmissions.delete(transactionId);
    }
}