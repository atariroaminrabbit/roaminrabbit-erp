// RoaminCoins
export type CoinTransactionType = 'earned' | 'redeemed'

export interface CoinTransaction {
  id: string
  userId: string
  type: CoinTransactionType
  amount: number            // USD value (1 RoaminCoin = $1 USD)
  orderId: string           // linked eSIM order
  timestamp: string         // ISO 8601
  balanceAfter: number      // running wallet balance after this transaction
  expiryDate?: string | null // reserved for future use — do NOT render in UI
}

export interface CoinMonthlyReport {
  month: string             // e.g. "2026-01"
  coinsIssued: number       // total earned that month in USD
  coinsRedeemed: number     // total redeemed that month in USD
  outstandingLiability: number // cumulative unspent coins at end of month in USD
}
