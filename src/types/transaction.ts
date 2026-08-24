export interface Transaction {
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
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
    status: "DRAFT" | "PENDING_REVIEW" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
    providerReference: string | null;
    createdAt: string;
  }