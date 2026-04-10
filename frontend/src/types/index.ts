// RoaminCoins
export type CoinTransactionType = 'earned' | 'redeemed' | 'granted'
export type CoinReferenceType = 'order' | 'grant'

export interface CoinTransaction {
  id: string
  userId: string
  type: CoinTransactionType
  amount: number              // USD value (1 RoaminCoin = $1 USD)
  referenceType: CoinReferenceType // 'order' for eSIM purchases, 'grant' for manual grants
  referenceId: string         // order ID (e.g. RR-YYYYMMDD-XXX) or grant ID (e.g. GRT-001)
  timestamp: string           // ISO 8601
  balanceAfter: number        // running wallet balance after this transaction
  expiryDate?: string | null  // reserved for future use — do NOT render in UI
}

export interface GrantReason {
  id: string       // slugified, e.g. 'marketing-activation'
  label: string    // display name, e.g. 'Marketing Activation'
  createdAt: string
}

export interface CoinGrant {
  id: string             // unique grant ID, e.g. 'GRT-001'
  userId: string
  amount: number
  reasonId: string       // references GrantReason.id
  grantedBy: string      // admin display name
  timestamp: string      // ISO 8601 — when the grant was approved
  transactionId: string  // linked CoinTransaction.id created on approval
  batchId?: string | null // populated for CSV bulk grants, e.g. 'BATCH-001'
}

export interface CoinMonthlyReport {
  month: string             // e.g. "2026-01"
  coinsIssued: number       // total earned that month in USD
  coinsRedeemed: number     // total redeemed that month in USD
  outstandingLiability: number // cumulative unspent coins at end of month in USD
}
