import type { ScheduledUpload } from '../types'

// Seed with realistic records:
//   - partner-001 (Book Cabin): one applied upload
//   - partner-002 (Global Tix): one pending upload (demonstrates disabled Upload CSV button)
const initialScheduledUploads: ScheduledUpload[] = [
  // ── Book Cabin (partner-001) ───────────────────────────────────────────────
  {
    id: 'su-001',
    partnerId: 'partner-001',
    fileName: 'book-cabin-packages-2026-04-01.csv',
    uploadedAt: '2026-04-01T09:14:00Z',
    activationAt: 'immediate',
    status: 'applied',
    rows: [
      { sku: 'MP-AU1GBNONHKIP-07-01', partnerPrice: 22000 },
      { sku: 'MP-AU3GBNONHKIP-15-01', partnerPrice: 58000 },
      { sku: 'MP-AU5GBNONHKIP-30-01', partnerPrice: 80000 },
      { sku: 'MP-AU10GBNONHKIP-30-01', partnerPrice: 165000 },
      { sku: 'MP-AU20GBNONHKIP-30-01', partnerPrice: 310000 },
    ],
  },
  {
    id: 'su-003',
    partnerId: 'partner-001',
    fileName: 'book-cabin-packages-2026-03-10.csv',
    uploadedAt: '2026-03-10T14:02:00Z',
    activationAt: '2026-03-11T08:00:00Z',
    status: 'applied',
    rows: [
      { sku: 'MP-AU1GBNONHKIP-07-01', partnerPrice: 20000 },
      { sku: 'MP-AU3GBNONHKIP-15-01', partnerPrice: 55000 },
      { sku: 'MP-AU5GBNONHKIP-30-01', partnerPrice: 76000 },
    ],
  },
  {
    id: 'su-004',
    partnerId: 'partner-001',
    fileName: 'book-cabin-packages-2026-03-01.csv',
    uploadedAt: '2026-03-01T11:30:00Z',
    activationAt: '2026-03-02T09:00:00Z',
    status: 'cancelled',
    rows: [
      { sku: 'MP-AU1GBNONHKIP-07-01', partnerPrice: 19000 },
      { sku: 'MP-AU3GBNONHKIP-15-01', partnerPrice: 52000 },
    ],
  },
  // ── Global Tix (partner-002) ───────────────────────────────────────────────
  {
    id: 'su-002',
    partnerId: 'partner-002',
    fileName: 'global-tix-packages-2026-04-15.csv',
    uploadedAt: '2026-04-15T08:00:00Z',
    activationAt: '2026-04-15T12:00:00Z',
    status: 'pending',
    rows: [
      { sku: 'MP-CN-31GBNONHKIP-07-01', partnerPrice: 45000 },
      { sku: 'MP-CN-33GBNONHKIP-15-01', partnerPrice: 95000 },
      { sku: 'MP-SG1GBNONHKIP-07-01', partnerPrice: 35000 },
    ],
  },
  {
    id: 'su-005',
    partnerId: 'partner-002',
    fileName: 'global-tix-packages-2026-03-20.csv',
    uploadedAt: '2026-03-20T10:45:00Z',
    activationAt: 'immediate',
    status: 'applied',
    rows: [
      { sku: 'MP-CN-31GBNONHKIP-07-01', partnerPrice: 42000 },
      { sku: 'MP-CN-33GBNONHKIP-15-01', partnerPrice: 88000 },
    ],
  },
  // ── Grab (partner-003) ────────────────────────────────────────────────────
  {
    id: 'su-006',
    partnerId: 'partner-003',
    fileName: 'grab-packages-2026-04-10.csv',
    uploadedAt: '2026-04-10T07:20:00Z',
    activationAt: 'immediate',
    status: 'applied',
    rows: [
      { sku: 'MP-SG1GBNONHKIP-07-01', partnerPrice: 28000 },
      { sku: 'MP-SG3GBNONHKIP-15-01', partnerPrice: 65000 },
      { sku: 'MP-SG5GBNONHKIP-30-01', partnerPrice: 110000 },
    ],
  },
]

let store: ScheduledUpload[] = [...initialScheduledUploads]

export function getScheduledUploadStore(): ScheduledUpload[] {
  return store
}

export function setScheduledUploadStore(next: ScheduledUpload[]): void {
  store = next
}

export function addScheduledUpload(entry: ScheduledUpload): void {
  store = [entry, ...store]
}

export function updateScheduledUploadStatus(
  id: string,
  status: ScheduledUpload['status'],
): void {
  store = store.map((s) => (s.id === id ? { ...s, status } : s))
}
