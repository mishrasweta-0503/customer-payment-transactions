import { NextRequest, NextResponse } from 'next/server';

//mock data
const transactions = [
  {
    id: 'TX-101',
    reference: 'REF-101',
    customerId: 'CUST-001',
    beneficiaryName: 'John Doe',
    beneficiaryAccount: '1234567890123456',
    sourceCurrency: 'AED',
    destinationCurrency: 'USD',
    sourceAmount: 1000,
    destinationAmount: 272.3,
    exchangeRate: 0.2723,
    riskLevel: 'LOW',
    status: 'COMPLETED',
    providerReference: 'PAY-1001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'TX-102',
    reference: 'REF-102',
    customerId: 'CUST-002',
    beneficiaryName: 'Jane Smith',
    beneficiaryAccount: '0987654321098765',
    sourceCurrency: 'AED',
    destinationCurrency: 'USD',
    sourceAmount: 6000,
    destinationAmount: null,
    exchangeRate: null,
    riskLevel: 'HIGH',
    status: 'PENDING_REVIEW',
    providerReference: null,
    createdAt: new Date().toISOString(),
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json(transaction);
}