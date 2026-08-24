//the purpose is to expose the helper function getExchangeRate to the frontend via standard fetch requests

import { NextRequest, NextResponse } from 'next/server';
import {getExchangeRate} from '@/lib/exchangeRate';

export async function GET(request:NextRequest){
    const {searchParams} = new URL(request.url);
    const from = searchParams.get('from')?.toUpperCase();
    const to = searchParams.get('to')?.toUpperCase();
    if (!from || !to) {
        return NextResponse.json({ error: 'Missing from and to currencies' },{ status: 400 });
    }
    try {
        const rate = await getExchangeRate(from, to);
        return NextResponse.json({ from, to, rate});
    } catch (error) {
       console.log(error);
       return NextResponse.json({ error: 'Internal server error' },{ status: 500 });
    }
}