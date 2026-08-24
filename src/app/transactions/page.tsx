'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Transaction } from '@/types/transaction';

export default function TransactionListPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'sourceAmount'>('createdAt');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        search,
        status,
        sortBy,
        page: page.toString(),
        limit: '10',
      });

      const res = await fetch(`/api/transactions?${params.toString()}`);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        setTotalPages(1);
      } else {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, status, sortBy, page]);

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>Transaction List</h2>
        <Link href="/transactions/new" style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '14px' }}>
          + New Transaction
        </Link>
      </div>

      {/* Control Bar: Search, Status Filter, Sorting */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search by ID, beneficiary, customer..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="createdAt">Sort by Date</option>
          <option value="sourceAmount">Sort by Amount</option>
        </select>
      </div>

      {/* Loading and Error Feedback */}
      {loading && <p style={{ color: '#666' }}>Loading transactions...</p>}
      {error && <p style={{ color: '#dc2626', padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>{error}</p>}

      {/* Data Table */}
      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Reference</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Beneficiary</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Source Amount</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Created At</th>
              <th style={{ padding: '8px', border: '1px solid #ddd' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>{tx.reference || tx.id}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{tx.beneficiaryName}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{tx.sourceAmount} {tx.sourceCurrency}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <span style={{ padding: '2px 6px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '12px' }}>
                    {tx.status}
                  </span>
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  <Link href={`/transactions/${tx.id}`} style={{ color: '#2563eb' }}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages || items.length === 0}
          onClick={() => setPage((p) => p + 1)}
          style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: (page >= totalPages || items.length === 0) ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}