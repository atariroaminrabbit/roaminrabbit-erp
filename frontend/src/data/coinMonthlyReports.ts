import type { CoinMonthlyReport } from '../types'

// 12 months of aggregate RoaminCoins data (Apr 2025 – Mar 2026)
// coinsIssued grows gradually as the program gains adoption
// coinsRedeemed lags behind issued — users accumulate before spending
// outstandingLiability = cumulative unspent coins at end of each month

export const coinMonthlyReports: CoinMonthlyReport[] = [
  {
    month: '2025-04',
    coinsIssued: 0.80,
    coinsRedeemed: 0.00,
    outstandingLiability: 0.80,
  },
  {
    month: '2025-05',
    coinsIssued: 1.20,
    coinsRedeemed: 0.00,
    outstandingLiability: 2.00,
  },
  {
    month: '2025-06',
    coinsIssued: 1.50,
    coinsRedeemed: 0.80,
    outstandingLiability: 2.70,
  },
  {
    month: '2025-07',
    coinsIssued: 2.10,
    coinsRedeemed: 1.00,
    outstandingLiability: 3.80,
  },
  {
    month: '2025-08',
    coinsIssued: 2.40,
    coinsRedeemed: 1.20,
    outstandingLiability: 5.00,
  },
  {
    month: '2025-09',
    coinsIssued: 3.00,
    coinsRedeemed: 1.50,
    outstandingLiability: 6.50,
  },
  {
    month: '2025-10',
    coinsIssued: 3.50,
    coinsRedeemed: 2.00,
    outstandingLiability: 8.00,
  },
  {
    // Nov: TXN-0001 (1.25) + TXN-0004 (1.00) + TXN-0013 (1.00) = 3.25 earned, 0 redeemed
    month: '2025-11',
    coinsIssued: 3.25,
    coinsRedeemed: 0.00,
    outstandingLiability: 11.25,
  },
  {
    // Dec: TXN-0002 (1.10) + TXN-0005 (1.40) + TXN-0014 (1.50) = 4.00 earned
    //      TXN-0015 redeemed 2.50
    month: '2025-12',
    coinsIssued: 4.00,
    coinsRedeemed: 2.50,
    outstandingLiability: 12.75,
  },
  {
    // Jan: TXN-0003 (1.20) + TXN-0007 (1.30) + TXN-0009 (1.15) + TXN-0016 (1.20) = 4.85 earned
    //      TXN-0006 redeemed 2.40
    month: '2026-01',
    coinsIssued: 4.85,
    coinsRedeemed: 2.40,
    outstandingLiability: 15.20,
  },
  {
    // Feb: TXN-0008 (1.25) + TXN-0010 (1.00) + TXN-0017 (1.45) = 3.70 earned
    //      TXN-0011 redeemed 2.15
    month: '2026-02',
    coinsIssued: 3.70,
    coinsRedeemed: 2.15,
    outstandingLiability: 16.75,
  },
  {
    // Mar: TXN-0012 (1.35) + TXN-0019 (1.10) + TXN-0020 (1.25) + TXN-0021 (0.80) + TXN-0022 (0.60) = 5.10 earned
    //      TXN-0018 redeemed 2.65
    month: '2026-03',
    coinsIssued: 5.10,
    coinsRedeemed: 2.65,
    outstandingLiability: 19.20,
  },
]
