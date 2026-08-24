

import { NextRequest, NextResponse } from 'next/server';

//sample data to go with transaction list
const transactions = [
  {
    id: 'TX-101',
    reference: 'REF-101',
    customerId: 'CUST-001',
    beneficiaryName: 'John Doe',
    beneficiaryAccount: '1234567890',
    sourceCurrency: 'AED',
    destinationCurrency: 'USD',
    sourceAmount: '1000',
    destinationAmount: '272.3',
    exchangeRate: '0.2723',
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
    beneficiaryAccount: '0987654321',
    sourceCurrency: 'AED',
    destinationCurrency: 'USD',
    sourceAmount: '6000',
    destinationAmount: null,
    exchangeRate: null,
    riskLevel: 'HIGH',
    status: 'PENDING_REVIEW',
    providerReference: null,
    createdAt: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  let filtered = [...transactions];

  // 1. Filter by search query
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (tx) =>
        tx.id.toLowerCase().includes(q) ||
        tx.reference.toLowerCase().includes(q) ||
        tx.beneficiaryName.toLowerCase().includes(q)
    );
  }

  if (status) {
    filtered = filtered.filter((tx) => tx.status === status);
  }

  filtered.sort((a, b) => {
    if (sortBy === 'sourceAmount') {
      return Number(b.sourceAmount) - Number(a.sourceAmount);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return NextResponse.json({
    items,
    totalPages,
    currentPage: page,
    totalItems,
  });
}