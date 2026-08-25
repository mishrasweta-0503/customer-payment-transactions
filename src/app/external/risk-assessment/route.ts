import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceAmount } = body;
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 400) + 100));
    if (Math.random() < 0.05) {
      return NextResponse.json({ error: 'Risk provider timeout' }, { status: 504 });
    }

    const amount = Number(sourceAmount) || 0;
    const score = amount > 5000 ? 85 : 20;
    const level = score > 50 ? 'HIGH' : 'LOW';

    return NextResponse.json({ score, level });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}