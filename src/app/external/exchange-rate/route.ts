import { NextRequest, NextResponse } from 'next/server';

//calculate exchange rates between two currencies
const RATES_IN_USD: Record<string, number> = {
    USD: 1.0,
    AED: 0.2723,
    EUR: 1.08,
    INR: 0.012,
}

export async function GET(request:NextRequest) {
    const {searchParams} = new URL(request.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();
    if (!from || !to || !RATES_IN_USD[from] || !RATES_IN_USD[to]) {
        return NextResponse.json({ error: 'Invalid currency pair' },{ status: 400 });
    }
    const calculatedRate = (RATES_IN_USD[from] / RATES_IN_USD[to]).toFixed(4);
    return NextResponse.json({from,to, rate: calculatedRate})
}