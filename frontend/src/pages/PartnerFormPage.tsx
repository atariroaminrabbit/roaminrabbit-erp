import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, SelectPicker, Button, Stack, FlexboxGrid } from 'rsuite'
import { getPartnerStore, setPartnerStore } from '../data/partners'
import type { Partner } from '../types'

// ── Options ───────────────────────────────────────────────────────────────────

const companyTypeOptions = [
  { label: 'B2B', value: 'B2B' },
  { label: 'B2C', value: 'B2C' },
]

const phoneTypeOptions = [
  { label: 'Mobile', value: 'Mobile' },
  { label: 'Office', value: 'Office' },
]

const phoneCodeOptions = [
  { label: '+1 (US)', value: '+1' },
  { label: '+44 (UK)', value: '+44' },
  { label: '+60 (MY)', value: '+60' },
  { label: '+61 (AU)', value: '+61' },
  { label: '+62 (ID)', value: '+62' },
  { label: '+65 (SG)', value: '+65' },
  { label: '+66 (TH)', value: '+66' },
  { label: '+81 (JP)', value: '+81' },
]

const countryOptions = [
  { label: 'Singapore (SG)', value: 'SG' },
  { label: 'Indonesia (ID)', value: 'ID' },
  { label: 'Australia (AU)', value: 'AU' },
  { label: 'Japan (JP)', value: 'JP' },
  { label: 'Thailand (TH)', value: 'TH' },
  { label: 'United States (US)', value: 'US' },
  { label: 'United Kingdom (GB)', value: 'GB' },
  { label: 'Malaysia (MY)', value: 'MY' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `partner-${Date.now()}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartnerFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const existing = id ? getPartnerStore().find((p) => p.id === id) ?? null : null

  // Form state
  const [companyType, setCompanyType] = useState<string>(existing?.companyType ?? '')
  const [companyName, setCompanyName] = useState(existing?.companyName ?? '')
  const [contactPersonName, setContactPersonName] = useState(existing?.contactPersonName ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [phoneType, setPhoneType] = useState<string>(existing?.phoneType ?? 'Mobile')
  const [phoneCode, setPhoneCode] = useState<string>(existing?.phoneCode ?? '')
  const [phoneNumber, setPhoneNumber] = useState(existing?.phoneNumber ?? '')
  const [country, setCountry] = useState<string>(existing?.country ?? '')
  const [companyAddress, setCompanyAddress] = useState(existing?.companyAddress ?? '')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!companyType) newErrors.companyType = 'Company type is required.'
    if (!contactPersonName.trim()) newErrors.contactPersonName = 'Contact person name is required.'
    if (!email.trim()) newErrors.email = 'Company email is required.'
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required.'
    if (!country) newErrors.country = 'Country is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return

    const saved: Partner = {
      id: existing?.id ?? generateId(),
      companyType: companyType as 'B2B' | 'B2C',
      companyName: companyName.trim(),
      contactPersonName: contactPersonName.trim(),
      email: email.trim(),
      phoneType: phoneType as 'Mobile' | 'Office',
      phoneCode,
      phoneNumber: phoneNumber.trim(),
      country,
      companyAddress: companyAddress.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }

    const current = getPartnerStore()
    if (isEdit) {
      setPartnerStore(current.map((p) => (p.id === saved.id ? saved : p)))
    } else {
      setPartnerStore([saved, ...current])
    }

    navigate('/partners')
  }

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  const req = <span style={{ color: '#f44336' }}>*</span>

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: 32 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24 }}>
          <span
            style={{ color: '#0ecdc2', cursor: 'pointer', fontSize: 13 }}
            onClick={() => navigate('/partners')}
          >
            Partner Management
          </span>
          <span style={{ color: '#555', fontSize: 13, margin: '0 8px' }}>&gt;</span>
          <span style={{ color: '#8a8d94', fontSize: 13 }}>
            {isEdit ? 'Edit Partner' : 'Add Partner'}
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px' }}>
          {isEdit ? 'Edit Partner' : 'Add Partner'}
        </h1>

        {/* Form */}
        <div style={{ maxWidth: 860 }}>
          <Form fluid>
            {/* Row 1: Company Type | Company Name */}
            <FlexboxGrid className="form-row" style={{ marginBottom: 16 }}>
              <FlexboxGrid.Item colspan={12} style={{ paddingRight: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Company Type {req}</Form.ControlLabel>
                  <SelectPicker
                    data={companyTypeOptions}
                    value={companyType}
                    onChange={(val) => { setCompanyType(val ?? ''); clearError('companyType') }}
                    block
                    cleanable={false}
                    placeholder="Select company type"
                  />
                  {errors.companyType && (
                    <Form.HelpText style={{ color: '#f44336' }}>{errors.companyType}</Form.HelpText>
                  )}
                </Form.Group>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={12} style={{ paddingLeft: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Company Name</Form.ControlLabel>
                  <Input
                    value={companyName}
                    onChange={setCompanyName}
                    placeholder="Enter company name"
                  />
                </Form.Group>
              </FlexboxGrid.Item>
            </FlexboxGrid>

            {/* Row 2: Contact Person Name | Company Email */}
            <FlexboxGrid className="form-row" style={{ marginBottom: 16 }}>
              <FlexboxGrid.Item colspan={12} style={{ paddingRight: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Contact Person Name {req}</Form.ControlLabel>
                  <Input
                    value={contactPersonName}
                    onChange={(val) => { setContactPersonName(val); clearError('contactPersonName') }}
                    placeholder="Enter contact person full name"
                  />
                  {errors.contactPersonName && (
                    <Form.HelpText style={{ color: '#f44336' }}>{errors.contactPersonName}</Form.HelpText>
                  )}
                </Form.Group>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={12} style={{ paddingLeft: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Company Email {req}</Form.ControlLabel>
                  <Input
                    value={email}
                    onChange={(val) => { setEmail(val); clearError('email') }}
                    placeholder="Enter partner's company email"
                    type="email"
                  />
                  {errors.email && (
                    <Form.HelpText style={{ color: '#f44336' }}>{errors.email}</Form.HelpText>
                  )}
                </Form.Group>
              </FlexboxGrid.Item>
            </FlexboxGrid>

            {/* Row 3: Phone Type | Code | Phone Number */}
            <FlexboxGrid className="form-row" style={{ marginBottom: 16 }}>
              <FlexboxGrid.Item colspan={8} style={{ paddingRight: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Phone Type</Form.ControlLabel>
                  <SelectPicker
                    data={phoneTypeOptions}
                    value={phoneType}
                    onChange={(val) => setPhoneType(val ?? 'Mobile')}
                    block
                    cleanable={false}
                  />
                </Form.Group>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={8} style={{ paddingRight: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Code {req}</Form.ControlLabel>
                  <SelectPicker
                    data={phoneCodeOptions}
                    value={phoneCode}
                    onChange={(val) => setPhoneCode(val ?? '')}
                    block
                    placeholder="Select code"
                  />
                </Form.Group>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={8}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Phone Number {req}</Form.ControlLabel>
                  <Input
                    value={phoneNumber}
                    onChange={(val) => { setPhoneNumber(val); clearError('phoneNumber') }}
                    placeholder="Enter phone number"
                  />
                  {errors.phoneNumber && (
                    <Form.HelpText style={{ color: '#f44336' }}>{errors.phoneNumber}</Form.HelpText>
                  )}
                </Form.Group>
              </FlexboxGrid.Item>
            </FlexboxGrid>

            {/* Row 4: Country | Company Address */}
            <FlexboxGrid className="form-row" style={{ marginBottom: 16 }}>
              <FlexboxGrid.Item colspan={12} style={{ paddingRight: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Country {req}</Form.ControlLabel>
                  <SelectPicker
                    data={countryOptions}
                    value={country}
                    onChange={(val) => { setCountry(val ?? ''); clearError('country') }}
                    block
                    cleanable={false}
                    placeholder="Select country"
                  />
                  {errors.country && (
                    <Form.HelpText style={{ color: '#f44336' }}>{errors.country}</Form.HelpText>
                  )}
                </Form.Group>
              </FlexboxGrid.Item>
              <FlexboxGrid.Item colspan={12} style={{ paddingLeft: 12 }}>
                <Form.Group style={{ marginBottom: 0 }}>
                  <Form.ControlLabel>Company Address</Form.ControlLabel>
                  <Input
                    value={companyAddress}
                    onChange={setCompanyAddress}
                    placeholder="Enter company address"
                  />
                </Form.Group>
              </FlexboxGrid.Item>
            </FlexboxGrid>
          </Form>
        </div>
      </div>

      {/* Pinned footer */}
      <div style={{
        padding: '16px 32px',
        borderTop: '1px solid #2e3138',
        background: '#13151b',
        position: 'sticky',
        bottom: 0,
      }}>
        <Stack spacing={8} justifyContent="flex-end">
          <Button
            appearance="primary"
            onClick={handleSave}
            style={{ background: '#0ecdc2', color: '#000' }}
          >
            Save
          </Button>
          <Button appearance="subtle" onClick={() => navigate('/partners')}>
            Cancel
          </Button>
        </Stack>
      </div>
    </div>
  )
}
