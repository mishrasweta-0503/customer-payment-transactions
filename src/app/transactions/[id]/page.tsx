'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface TransactionDetail {
  id: string;
  reference: string;
  customerId: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number | null;
  exchangeRate: number | null;
  riskLevel: string | null;
  status: string;
  providerReference: string | null;
  createdAt: string;
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/transactions/${id}`);
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Server responded with status ${res.status}`);
        }
        const data = await res.json();
        setTransaction(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load transaction details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTransaction();
    }
  }, [id]);

  const maskAccount = (accountNumber: string) => {
    if (!accountNumber) return '-';
    if (accountNumber.length <= 4) return accountNumber;
    return `•••• •••• ${accountNumber.slice(-4)}`;
  };

  return (
    <div>
      <div>
        <Link href="/transactions">← Back to Transactions</Link>
        <h2>Transaction Details</h2>
      </div>

      {loading && <p>Loading transaction details...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && transaction && (
        <div>
          <div>
            <h3>Status</h3>
            <p>{transaction.status}</p>
          </div>

          <div>
            <h3>Transaction Reference</h3>
            <p>{transaction.reference || transaction.id}</p>
          </div>

          <div>
            <h3>Provider Reference</h3>
            <p>{transaction.providerReference || 'N/A'}</p>
          </div>

          <div>
            <h3>Customer ID</h3>
            <p>{transaction.customerId}</p>
          </div>

          <div>
            <h3>Beneficiary Name</h3>
            <p>{transaction.beneficiaryName}</p>
          </div>

          <div>
            <h3>Masked Beneficiary Account</h3>
            <p>{maskAccount(transaction.beneficiaryAccount)}</p>
          </div>

          <div>
            <h3>Source Amount</h3>
            <p>{transaction.sourceAmount} {transaction.sourceCurrency}</p>
          </div>

          <div>
            <h3>Destination Amount</h3>
            <p>{transaction.destinationAmount ? `${transaction.destinationAmount} ${transaction.destinationCurrency}` : 'N/A'}</p>
          </div>

          <div>
            <h3>Exchange Rate</h3>
            <p>{transaction.exchangeRate ? transaction.exchangeRate : 'N/A'}</p>
          </div>

          <div>
            <h3>Risk Result</h3>
            <p>{transaction.riskLevel || 'NOT_ASSESSED'}</p>
          </div>

          <div>
            <h3>Created At</h3>
            <p>{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : '-'}</p>
          </div>

          {transaction.status === 'DRAFT' && (
            <div>
              <Link href={`/transactions/${transaction.id}/submit`}>
                Proceed to Submit
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}