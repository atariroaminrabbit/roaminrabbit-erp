import type { Partner } from '../types'

export const initialPartners: Partner[] = [
  {
    id: 'partner-001',
    companyType: 'B2B',
    companyName: 'Book Cabin',
    contactPersonName: 'Dahru Dzahaban',
    email: 'dahru.dzahaban@bookcabin.com',
    phoneType: 'Mobile',
    phoneCode: '+62',
    phoneNumber: '8568510224',
    country: 'ID',
    companyAddress: '',
    createdAt: '2025-11-01T08:00:00Z',
  },
  {
    id: 'partner-002',
    companyType: 'B2B',
    companyName: 'Global Tix',
    contactPersonName: 'Alex Tan',
    email: 'alex.tan@globaltix.com',
    phoneType: 'Office',
    phoneCode: '+65',
    phoneNumber: '62248000',
    country: 'SG',
    companyAddress: '8 Shenton Way, Singapore 068811',
    createdAt: '2025-11-15T08:00:00Z',
  },
  {
    id: 'partner-003',
    companyType: 'B2B',
    companyName: 'Grab',
    contactPersonName: 'Sarah Lim',
    email: 'sarah.lim@grab.com',
    phoneType: 'Mobile',
    phoneCode: '+65',
    phoneNumber: '91234567',
    country: 'SG',
    companyAddress: '3 Media Close, Singapore 138498',
    createdAt: '2025-12-01T08:00:00Z',
  },
]

// ── Module-level mutable store ────────────────────────────────────────────────
// Used so add/edit sub-pages can persist changes back to the list page on remount.

let _store: Partner[] = [...initialPartners]

export function getPartnerStore(): Partner[] {
  return _store
}

export function setPartnerStore(partners: Partner[]): void {
  _store = partners
}
