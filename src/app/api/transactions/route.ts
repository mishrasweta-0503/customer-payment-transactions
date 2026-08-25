import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimiter';

interface Transaction {
  id: string;
  reference: string;
  customerId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: string;
  destinationAmount: string | null;
  exchangeRate: string | null;
  riskLevel: string | null;
  status: string;
  providerReference: string | null;
  createdAt: string;
}

const transactions: Transaction[] = [
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

const processedTokens = new Set<string>();

export async function GET(request: NextRequest) {
  const limitResponse = await applyRateLimit(request, 'transactions-list');
  if (limitResponse) return limitResponse;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  let filtered = [...transactions];
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
    totalItems,
    totalPages,
    currentPage: page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const limitResponse = await applyRateLimit(request, 'transactions-create');
  if (limitResponse) return limitResponse;
  try {
    const body = await request.json();
    const {
      idempotencyKey,
      customerId,
      beneficiaryName,
      beneficiaryAccount,
      sourceCurrency,
      destinationCurrency,
      sourceAmount,
    } = body;

    // Avoid repeated submissions
    if (idempotencyKey && processedTokens.has(idempotencyKey)) {
      return NextResponse.json(
        { error: 'Duplicate submission detected. Please do not re-submit.' },
        { status: 409 }
      );
    }

    // Server side validation
    const errors: Record<string, string> = {};

    if (!customerId || customerId.trim() === '') {
      errors.customerId = 'Customer ID is required.';
    }
    if (!beneficiaryName || beneficiaryName.trim() === '') {
      errors.beneficiaryName = 'Beneficiary Name is required.';
    }
    if (!beneficiaryAccount || beneficiaryAccount.trim().length < 8) {
      errors.beneficiaryAccount = 'Beneficiary Account must be at least 8 digits.';
    }
    if (!sourceCurrency) {
      errors.sourceCurrency = 'Source currency is required.';
    }
    if (!destinationCurrency) {
      errors.destinationCurrency = 'Destination currency is required.';
    }
    if (!sourceAmount || isNaN(Number(sourceAmount)) || Number(sourceAmount) <= 0) {
      errors.sourceAmount = 'Amount must be a positive number greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Lock token if provided
    if (idempotencyKey) {
      processedTokens.add(idempotencyKey);
    }

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      reference: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: String(customerId),
      beneficiaryName: String(beneficiaryName),
      beneficiaryAccount: String(beneficiaryAccount),
      sourceCurrency: String(sourceCurrency),
      destinationCurrency: String(destinationCurrency),
      sourceAmount: String(sourceAmount),
      destinationAmount: null,
      exchangeRate: null,
      riskLevel: 'NOT_ASSESSED',
      status: 'DRAFT',
      providerReference: null,
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(newTransaction);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}