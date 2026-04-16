import type { PartnerPackageConfig } from '../types'
import { masterCatalog } from './masterCatalog'

// ── Helper ────────────────────────────────────────────────────────────────────

function pkg(
  id: string,
  partnerId: string,
  sku: string,
  partnerPrice: number,
): PartnerPackageConfig {
  const cat = masterCatalog.find((c) => c.sku === sku)
  if (!cat) throw new Error(`Master catalog SKU not found: ${sku}`)
  return {
    id,
    partnerId,
    sku,
    partnerPrice,
    vendor: cat.vendor,
    esimLabel: cat.esimLabel,
    country: cat.country,
    countryRegion: cat.countryRegion,
    packageSpec: cat.packageSpec,
    networkType: cat.networkType,
    specification: cat.specification,
    bandwidth: cat.bandwidth,
    validity: cat.validity,
    settlementPrice: cat.settlementPrice,
  }
}

// ── Initial data ──────────────────────────────────────────────────────────────

export const initialPartnerPackages: PartnerPackageConfig[] = [
  // ── Book Cabin (partner-001) — ~25% markup ────────────────────────────────
  pkg('pp-001', 'partner-001', 'MP-AU1GBNONHKIP-07-01', 21675),
  pkg('pp-002', 'partner-001', 'MP-AU5GBNONHKIP-30-01', 84150),
  pkg('pp-003', 'partner-001', 'MP-AU10GBNONHKIP-30-01', 180413),
  pkg('pp-004', 'partner-001', 'MP-CN-31GBNONHKIP-07-01', 31875),
  pkg('pp-005', 'partner-001', 'MP-CN-35GBNONHKIP-30-01', 121125),
  pkg('pp-006', 'partner-001', 'MP-SG1GBNONHKIP-07-01', 15625),
  pkg('pp-007', 'partner-001', 'MP-SG5GBNONHKIP-30-01', 67750),
  pkg('pp-008', 'partner-001', 'MP-JP1GBNONHKIP-07-01', 23625),
  pkg('pp-009', 'partner-001', 'MP-JP5GBNONHKIP-30-01', 98875),
  pkg('pp-010', 'partner-001', 'MP-TH1GBNONHKIP-07-01', 14000),
  pkg('pp-011', 'partner-001', 'MP-SEA1GBNONHKIP-07-01', 24750),
  pkg('pp-012', 'partner-001', 'MP-SEA5GBNONHKIP-30-01', 112125),

  // ── Global Tix (partner-002) — ~30% markup ────────────────────────────────
  pkg('pp-013', 'partner-002', 'MP-AU1GBNONHKIP-07-01', 22542),
  pkg('pp-014', 'partner-002', 'MP-AU3GBNONHKIP-15-01', 60112),
  pkg('pp-015', 'partner-002', 'MP-AU10GBNONHKIP-30-01', 187629),
  pkg('pp-016', 'partner-002', 'MP-CN-33GBNONHKIP-15-01', 81770),
  pkg('pp-017', 'partner-002', 'MP-CN-310GBNONHKIP-30-01', 218790),
  pkg('pp-018', 'partner-002', 'MP-SG3GBNONHKIP-15-01', 46540),
  pkg('pp-019', 'partner-002', 'MP-JP3GBNONHKIP-15-01', 68120),
  pkg('pp-020', 'partner-002', 'MP-JP10GBNONHKIP-30-01', 192660),
  pkg('pp-021', 'partner-002', 'MP-TH3GBNONHKIP-15-01', 41340),
  pkg('pp-022', 'partner-002', 'MP-SEA3GBNONHKIP-15-01', 75920),

  // ── Grab (partner-003) — ~20% markup ─────────────────────────────────────
  pkg('pp-023', 'partner-003', 'MP-AU5GBNONHKIP-30-01', 80784),
  pkg('pp-024', 'partner-003', 'MP-AU20GBNONHKIP-30-01', 323136),
  pkg('pp-025', 'partner-003', 'MP-CN-35GBNONHKIP-30-01', 116280),
  pkg('pp-026', 'partner-003', 'MP-CN-320GBNONHKIP-30-01', 342720),
  pkg('pp-027', 'partner-003', 'MP-SG1GBNONHKIP-07-01', 15000),
  pkg('pp-028', 'partner-003', 'MP-SG3GBNONHKIP-15-01', 42960),
  pkg('pp-029', 'partner-003', 'MP-SG5GBNONHKIP-30-01', 65040),
  pkg('pp-030', 'partner-003', 'MP-JP5GBNONHKIP-30-01', 94920),
  pkg('pp-031', 'partner-003', 'MP-TH1GBNONHKIP-07-01', 13440),
  pkg('pp-032', 'partner-003', 'MP-TH5GBNONHKIP-30-01', 59400),
  pkg('pp-033', 'partner-003', 'MP-SEA1GBNONHKIP-07-01', 23760),
  pkg('pp-034', 'partner-003', 'MP-SEA5GBNONHKIP-30-01', 107640),
  pkg('pp-035', 'partner-003', 'MP-SEA10GBNONHKIP-30-01', 202200),
]

// ── Module-level mutable store ────────────────────────────────────────────────

let _store: PartnerPackageConfig[] = [...initialPartnerPackages]

export function getPartnerPackageStore(): PartnerPackageConfig[] {
  return _store
}

export function setPartnerPackageStore(packages: PartnerPackageConfig[]): void {
  _store = packages
}
