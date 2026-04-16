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

// ── Partner Management ────────────────────────────────────────────────────────

export interface Partner {
  id: string
  companyType: 'B2B' | 'B2C'
  companyName: string
  contactPersonName: string
  email: string
  phoneType: 'Mobile' | 'Office'
  phoneCode: string        // e.g. '+65'
  phoneNumber: string
  country: string          // ISO code e.g. 'SG'
  companyAddress?: string
  createdAt: string
}

export interface MasterCatalogSku {
  sku: string              // e.g. 'MP-AU1GBNONHKIP-07-01'
  vendor: string           // e.g. 'ESIM Access'
  esimLabel: string
  country: string          // Country or region name
  countryRegion?: string[] // Populated only for regional SKUs
  packageSpec: string      // e.g. 'Australia 1GB 7Days (nonhkip)'
  networkType?: string
  specification?: string
  bandwidth: string        // e.g. '1GB'
  validity: string         // e.g. '7 Days'
  settlementPrice: number  // IDR, no decimals
}

export interface PartnerPackageConfig {
  id: string
  partnerId: string
  sku: string              // References MasterCatalogSku.sku
  partnerPrice: number     // IDR, admin-set
  // Denormalised from master catalog for display
  vendor: string
  esimLabel: string
  country: string
  countryRegion?: string[]
  packageSpec: string
  networkType?: string
  specification?: string
  bandwidth: string
  validity: string
  settlementPrice: number
}

export interface ScheduledUpload {
  id: string
  partnerId: string
  fileName: string
  uploadedAt: string                      // ISO timestamp
  activationAt: string | 'immediate'      // ISO timestamp or 'immediate'
  status: 'pending' | 'applied' | 'cancelled'
  rows: Array<{ sku: string; partnerPrice: number }> // snapshot for re-download
}
