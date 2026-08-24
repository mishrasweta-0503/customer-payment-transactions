import { NextRequest, NextResponse } from 'next/server';

const globalForPayments = globalThis as unknown as {processedPayments: Set<string> | undefined}; //global store to track processed payment keys (prevents duplicate charges)

const processedPayments = globalForPayments.processedPayments ?? new Set<string>();

if (process.env.NODE_ENV !== 'production') {
    globalForPayments.processedPayments = processedPayments
};

export async function POST(request: NextRequest){
    try {
        const body = await request.json();
        const { transactionId, amount, currency } = body;
        if (!transactionId) {
            return NextResponse.json({ error: 'Required transaction Id' },{ status: 400 });
        }
        //duplicate checks
        if (processedPayments.has(transactionId)) {
            return NextResponse.json({ error: 'Duplicate payment request detected for this transaction' },{ status: 409 });
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        processedPayments.add(transactionId);
        const providerReference = `PAY-${Math.floor(100000 + Math.random() * 900000)}`;
        return NextResponse.json({providerReference,status: 'ACCEPTED'});
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process payment request' },{ status: 500 });
    }
}
