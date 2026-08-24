'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormErrors {
  customerId?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  sourceCurrency?: string;
  destinationCurrency?: string;
  sourceAmount?: string;
  server?: string;
}

export default function NewTransactionPage() {
  const router = useRouter();

  const [customerId, setCustomerId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('AED');
  const [destinationCurrency, setDestinationCurrency] = useState('USD');
  const [sourceAmount, setSourceAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const errs: FormErrors = {};

    if (!customerId.trim()) {
      errs.customerId = 'Customer ID is required.';
    }
    if (!beneficiaryName.trim()) {
      errs.beneficiaryName = 'Beneficiary Name is required.';
    }
    if (!beneficiaryAccount.trim()) {
      errs.beneficiaryAccount = 'Beneficiary Account is required.';
    } else if (beneficiaryAccount.trim().length < 8) {
      errs.beneficiaryAccount = 'Beneficiary Account must be at least 8 digits.';
    }
    if (!sourceAmount || isNaN(Number(sourceAmount)) || Number(sourceAmount) <= 0) {
      errs.sourceAmount = 'Amount must be a positive number greater than 0.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const idempotencyKey = `SUBMIT-${Date.now()}-${Math.random()}`;

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          customerId,
          beneficiaryName,
          beneficiaryAccount,
          sourceCurrency,
          destinationCurrency,
          sourceAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details);
        } else {
          setErrors({ server: data.error || 'Failed to create transaction.' });
        }
        setIsSubmitting(false);
        return;
      }

      router.push('/transactions');
      router.refresh();
    } catch (err: any) {
      setErrors({ server: err.message || 'An unexpected error occurred.' });
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '6px 10px',
    borderRadius: '4px',
  };

  return (
    <div>
      <div>
        <Link href="/transactions">← Back to Transactions</Link>
        <h2>New Transaction</h2>
      </div>

      {errors.server && <p>{errors.server}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Customer ID:</label>
          <br />
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          />
          {errors.customerId && <p>{errors.customerId}</p>}
        </div>

        <div>
          <label>Beneficiary Name:</label>
          <br />
          <input
            type="text"
            value={beneficiaryName}
            onChange={(e) => setBeneficiaryName(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          />
          {errors.beneficiaryName && <p>{errors.beneficiaryName}</p>}
        </div>

        <div>
          <label>Beneficiary Account Number:</label>
          <br />
          <input
            type="text"
            value={beneficiaryAccount}
            onChange={(e) => setBeneficiaryAccount(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          />
          {errors.beneficiaryAccount && <p>{errors.beneficiaryAccount}</p>}
        </div>

        <div>
          <label>Source Currency:</label>
          <br />
          <select
            value={sourceCurrency}
            onChange={(e) => setSourceCurrency(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          >
            <option value="AED">AED</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          {errors.sourceCurrency && <p>{errors.sourceCurrency}</p>}
        </div>

        <div>
          <label>Destination Currency:</label>
          <br />
          <select
            value={destinationCurrency}
            onChange={(e) => setDestinationCurrency(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          >
            <option value="USD">USD</option>
            <option value="AED">AED</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          {errors.destinationCurrency && <p>{errors.destinationCurrency}</p>}
        </div>

        <div>
          <label>Source Amount:</label>
          <br />
          <input
            type="number"
            value={sourceAmount}
            onChange={(e) => setSourceAmount(e.target.value)}
            disabled={isSubmitting}
            style={inputStyle}
          />
          {errors.sourceAmount && <p>{errors.sourceAmount}</p>}
        </div>

        <br />

        <div>
          <button type="submit" disabled={isSubmitting} style={inputStyle}>
            {isSubmitting ? 'Submitting...' : 'Create Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}