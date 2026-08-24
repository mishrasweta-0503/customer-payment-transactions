import { NextRequest, NextResponse } from 'next/server';


export async function POST(request:NextRequest){
    try {
        const body = await request.json();
        const {amount} = body;
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 400) + 100));
        const score = amount > 5000 ? 85 : 20; //transactions above 5000 are high risk
        const level = score > 50 ? 'HIGH' : 'LOW'; //score more than 50 is high else low
        return NextResponse.json({score,level})
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request payload' },{ status: 400 });
    }

}