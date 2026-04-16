import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Table, Button, Stack, Drawer, Form, Input, SelectPicker, InputNumber, Dropdown, Tag, Radio, RadioGroup, DatePicker, Tooltip, Whisper, Tabs, Modal } from 'rsuite'
import { getPartnerStore } from '../data/partners'
import { getPartnerPackageStore, setPartnerPackageStore } from '../data/partnerPackages'
import { masterCatalog } from '../data/masterCatalog'
import {
  getScheduledUploadStore,
  addScheduledUpload,
  updateScheduledUploadStatus,
} from '../data/scheduledUploads'
import type { PartnerPackageConfig } from '../types'

const { Column, HeaderCell, Cell } = Table

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatRegion(regions: string[] | undefined): string {
  if (!regions || regions.length === 0) return '-'
  const joined = regions.join(', ')
  return joined.length > 40 ? joined.slice(0, 40) + '…' : joined
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

function generateId(): string {
  return `pp-${Date.now()}`
}

// Column width tiers
const W = { sm: 90, md: 140, lg: 220 }

// CSV upload row shape (UI-only, not in index.ts)
type CsvRow = {
  rowNum: number
  sku: string
  partnerPrice: string
  status: 'valid' | 'invalid'
  errorCode?: string
}

// SKU picker options
const skuOptions = masterCatalog.map((cat) => ({
  label: `${cat.sku} — ${cat.packageSpec}`,
  value: cat.sku,
}))

// ── Component ─────────────────────────────────────────────────────────────────

export default function PartnerPackagesPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const partner = id ? getPartnerStore().find((p) => p.id === id) ?? null : null

  const [packages, setPackages] = useState<PartnerPackageConfig[]>(
    () => getPartnerPackageStore().filter((p) => p.partnerId === id),
  )

  // ── Search & filter state ─────────────────────────────────────────────────
  const [skuSearch, setSkuSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState<string | null>(null)

  const filteredPackages = packages.filter((p) => {
    const matchesSku = skuSearch === '' || p.sku.toLowerCase().includes(skuSearch.toLowerCase())
    const matchesCountry = countryFilter === null || p.country === countryFilter
    return matchesSku && matchesCountry
  })

  const countryOptions = [...new Set(packages.map((p) => p.country))]
    .sort()
    .map((c) => ({ label: c, value: c }))

  // ── Download Template helpers ──────────────────────────────────────────────
  const CSV_HEADERS = 'sku,vendor,esimLabel,country,countryRegion,packageSpec,networkType,specification,bandwidth,validity,settlementPrice,partnerPrice'

  function triggerDownload(csvString: string, filename: string) {
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadEmptyTemplate() {
    triggerDownload(CSV_HEADERS + '\n', 'partner-template-empty.csv')
  }

  function downloadPreFilledTemplate() {
    const rows = packages.map((p) => [
      p.sku,
      p.vendor,
      p.esimLabel,
      p.country,
      (p.countryRegion ?? []).join('|'),
      p.packageSpec,
      p.networkType ?? '',
      p.specification ?? '',
      p.bandwidth,
      p.validity,
      p.settlementPrice,
      p.partnerPrice,
    ].join(','))
    const csv = [CSV_HEADERS, ...rows].join('\n')
    const date = new Date().toISOString().split('T')[0]
    const slug = (partner?.companyName ?? 'partner').toLowerCase().replace(/\s+/g, '-')
    triggerDownload(csv, `partner-template-${slug}-${date}.csv`)
  }

  // ── Pending upload check ──────────────────────────────────────────────────
  const [scheduleStore, setScheduleStore] = useState(() => getScheduledUploadStore())

  const hasPendingUpload = scheduleStore.some(
    (s) => s.partnerId === id && s.status === 'pending',
  )

  const partnerHistory = scheduleStore.filter((s) => s.partnerId === id)

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'prices' | 'history'>('prices')

  // ── Cancel modal state ────────────────────────────────────────────────────
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)

  function handleOpenCancelModal(uploadId: string) {
    setCancelTargetId(uploadId)
    setCancelModalOpen(true)
  }

  function handleConfirmCancel() {
    if (!cancelTargetId) return
    updateScheduledUploadStatus(cancelTargetId, 'cancelled')
    setScheduleStore(getScheduledUploadStore())
    setCancelModalOpen(false)
    setCancelTargetId(null)
  }

  function downloadFromHistory(uploadId: string, fileName: string) {
    const upload = scheduleStore.find((s) => s.id === uploadId)
    if (!upload) return
    const headers = 'sku,partnerPrice'
    const rows = upload.rows.map((r) => `${r.sku},${r.partnerPrice}`)
    triggerDownload([headers, ...rows].join('\n'), fileName)
  }

  function formatTs(iso: string): string {
    return new Date(iso).toLocaleString('en-SG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Upload CSV drawer state ────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'parsed' | 'scheduling' | 'result'>('idle')
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([])
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadResult, setUploadResult] = useState<{ updated: number; rejected: number } | null>(null)
  const [scheduleMode, setScheduleMode] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null)
  const [scheduleDateError, setScheduleDateError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCloseUploadDrawer() {
    setUploadOpen(false)
    setUploadPhase('idle')
    setParsedRows([])
    setUploadFileName('')
    setUploadResult(null)
    setScheduleMode('immediate')
    setScheduleDate(null)
    setScheduleDateError('')
  }

  function parseCsvFile(file: File) {
    setUploadFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? ''
      const lines = text.trim().split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        setParsedRows([])
        setUploadPhase('parsed')
        return
      }
      const headers = lines[0].toLowerCase().split(',').map((h) => h.trim())
      const skuIdx = headers.indexOf('sku')
      const priceIdx = headers.indexOf('partnerprice')
      if (skuIdx === -1 || priceIdx === -1) {
        setParsedRows([])
        setUploadPhase('parsed')
        return
      }
      const dataLines = lines.slice(1)

      // Pre-pass: count SKU occurrences for ERR_004
      const skuCount: Record<string, number> = {}
      dataLines.forEach((line) => {
        try {
          const sku = line.split(',')[skuIdx]?.trim() ?? ''
          if (sku) skuCount[sku] = (skuCount[sku] ?? 0) + 1
        } catch { /* ignore */ }
      })

      const rows: CsvRow[] = dataLines.map((line, i) => {
        const rowNum = i + 2
        try {
          const cols = line.split(',')
          const sku = cols[skuIdx]?.trim() ?? ''
          const priceRaw = cols[priceIdx]?.trim() ?? ''
          if ((skuCount[sku] ?? 0) > 1) return { rowNum, sku, partnerPrice: priceRaw, status: 'invalid', errorCode: 'ERR_004' }
          if (!masterCatalog.some((c) => c.sku === sku)) return { rowNum, sku, partnerPrice: priceRaw, status: 'invalid', errorCode: 'ERR_001' }
          const price = parseFloat(priceRaw)
          if (!priceRaw || isNaN(price) || price <= 0) return { rowNum, sku, partnerPrice: priceRaw, status: 'invalid', errorCode: 'ERR_002' }
          return { rowNum, sku, partnerPrice: priceRaw, status: 'valid' }
        } catch {
          return { rowNum, sku: '', partnerPrice: '', status: 'invalid', errorCode: 'ERR_003' }
        }
      })

      setParsedRows(rows)
      setUploadPhase('parsed')
    }
    reader.readAsText(file)
  }

  function handleProceedToSchedule() {
    setUploadPhase('scheduling')
  }

  function handleConfirmUpload() {
    // Validate scheduled date if mode is 'scheduled'
    if (scheduleMode === 'scheduled') {
      if (!scheduleDate) {
        setScheduleDateError('Please select an activation date and time.')
        return
      }
      const minTime = new Date(Date.now() + 60 * 60 * 1000)
      if (scheduleDate < minTime) {
        setScheduleDateError('Activation time must be at least 1 hour from now.')
        return
      }
    }

    const validRows = parsedRows.filter((r) => r.status === 'valid')
    const rejectedCount = parsedRows.filter((r) => r.status === 'invalid').length
    const uploadRowSnapshot = validRows.map((r) => ({
      sku: r.sku,
      partnerPrice: parseFloat(r.partnerPrice),
    }))

    // Save ScheduledUpload record
    const newUpload = {
      id: `su-${Date.now()}`,
      partnerId: id!,
      fileName: uploadFileName,
      uploadedAt: new Date().toISOString(),
      activationAt: scheduleMode === 'immediate' ? 'immediate' as const : scheduleDate!.toISOString(),
      status: scheduleMode === 'immediate' ? 'applied' as const : 'pending' as const,
      rows: uploadRowSnapshot,
    }
    addScheduledUpload(newUpload)
    setScheduleStore(getScheduledUploadStore())

    if (scheduleMode === 'immediate') {
      // Full replacement: replace entire catalogue for this partner with valid rows
      const newPackages: PartnerPackageConfig[] = validRows.map((row) => {
        const price = parseFloat(row.partnerPrice)
        const cat = masterCatalog.find((c) => c.sku === row.sku)!
        return {
          id: generateId(),
          partnerId: id!,
          sku: cat.sku,
          partnerPrice: price,
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
      })
      setPackages(newPackages)
      setPartnerPackageStore([
        ...newPackages,
        ...getPartnerPackageStore().filter((p) => p.partnerId !== id),
      ])
    }
    // Scheduled: no change to package store yet — activates at scheduled time (production only)

    setUploadResult({ updated: validRows.length, rejected: rejectedCount })
    setUploadPhase('result')
  }

  function downloadErrorReport() {
    const headers = 'sku,partnerPrice,errorReason'
    const rows = parsedRows.map((r) =>
      `${r.sku},${r.partnerPrice},${r.status === 'invalid' ? (r.errorCode ?? '') : ''}`,
    )
    const date = new Date().toISOString().split('T')[0]
    triggerDownload([headers, ...rows].join('\n'), `error-report-${date}.csv`)
  }

  // ── Add Row drawer state ───────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [partnerPrice, setPartnerPrice] = useState<number | string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedCatalog = selectedSku
    ? masterCatalog.find((c) => c.sku === selectedSku) ?? null
    : null

  function resetDrawer() {
    setSelectedSku(null)
    setPartnerPrice('')
    setErrors({})
  }

  function handleCloseDrawer() {
    setDrawerOpen(false)
    resetDrawer()
  }

  function handleAdd() {
    const newErrors: Record<string, string> = {}
    if (!selectedSku) newErrors.sku = 'SKU is required.'
    if (!partnerPrice || Number(partnerPrice) <= 0) newErrors.partnerPrice = 'Partner price must be greater than 0.'
    if (selectedSku && packages.some((p) => p.sku === selectedSku)) {
      newErrors.sku = 'This SKU is already configured for this partner.'
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    const cat = selectedCatalog!
    const newEntry: PartnerPackageConfig = {
      id: generateId(),
      partnerId: id!,
      sku: cat.sku,
      partnerPrice: Number(partnerPrice),
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

    const updated = [newEntry, ...packages]
    setPackages(updated)
    // Persist to store so navigation away and back keeps the new row
    setPartnerPackageStore([
      newEntry,
      ...getPartnerPackageStore().filter((p) => !(p.partnerId === id && p.sku === cat.sku)),
    ])
    handleCloseDrawer()
  }

  // ── Table width (required for fixed columns) ───────────────────────────────
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [tableWidth, setTableWidth] = useState<number>(0)
  useEffect(() => {
    const el = tableContainerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      setTableWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <span style={{ color: '#8a8d94', fontSize: 13 }}>Edit Partner Package</span>
        </div>

        {/* Header */}
        <Stack
          justifyContent="space-between"
          alignItems="center"
          className="page-header"
          style={{ marginBottom: 24 }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>
            {partner?.companyName ?? 'Partner'}
          </h1>
          <Stack spacing={8}>
            <Button
              appearance="ghost"
              onClick={() => setDrawerOpen(true)}
            >
              Add Row
            </Button>
            <Whisper
              placement="bottom"
              trigger={hasPendingUpload ? 'hover' : 'none'}
              speaker={
                <Tooltip>
                  A scheduled upload is pending — cancel it from Upload History before uploading a new file.
                </Tooltip>
              }
            >
              <span>
                <Button
                  appearance="ghost"
                  disabled={hasPendingUpload}
                  onClick={() => setUploadOpen(true)}
                >
                  Upload CSV
                </Button>
              </span>
            </Whisper>
            <Dropdown title="Download Template" appearance="ghost" placement="bottomEnd">
              <Dropdown.Item onSelect={downloadEmptyTemplate}>Empty Template</Dropdown.Item>
              <Dropdown.Item onSelect={downloadPreFilledTemplate}>Pre-filled Template</Dropdown.Item>
            </Dropdown>
          </Stack>
        </Stack>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key as 'prices' | 'history')}
          appearance="tabs"
        >
          {/* ── Prices tab ── */}
          <Tabs.Tab eventKey="prices" title="Prices">
            <Stack spacing={12} style={{ marginTop: 16, marginBottom: 16 }} wrap>
              <Input
                placeholder="Search by SKU…"
                value={skuSearch}
                onChange={(val) => setSkuSearch(val)}
                style={{ width: 240 }}
              />
              <SelectPicker
                data={countryOptions}
                value={countryFilter}
                onChange={(val) => setCountryFilter(val)}
                placeholder="All Countries"
                style={{ width: 200 }}
                cleanable
              />
            </Stack>
            <div ref={tableContainerRef}>
              <Table
                data={filteredPackages}
                autoHeight
                bordered
                cellBordered
                rowHeight={48}
                headerHeight={44}
                width={tableWidth || undefined}
              >
                <Column width={W.md}>
                  <HeaderCell>Vendor</HeaderCell>
                  <Cell dataKey="vendor" />
                </Column>

                <Column width={W.lg}>
                  <HeaderCell>SKU</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => (
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.sku}</span>
                    )}
                  </Cell>
                </Column>

                <Column width={W.lg}>
                  <HeaderCell>Package Name</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => toTitleCase(row.packageSpec)}
                  </Cell>
                </Column>

                <Column width={W.md}>
                  <HeaderCell>Country Package</HeaderCell>
                  <Cell dataKey="country" />
                </Column>

                <Column width={W.lg}>
                  <HeaderCell>Country Sub Package</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => formatRegion(row.countryRegion)}
                  </Cell>
                </Column>

                <Column width={W.sm}>
                  <HeaderCell>Bandwidth</HeaderCell>
                  <Cell dataKey="bandwidth" />
                </Column>

                <Column width={W.sm}>
                  <HeaderCell>Validity</HeaderCell>
                  <Cell dataKey="validity" />
                </Column>

                <Column width={W.md}>
                  <HeaderCell>eSIM Label</HeaderCell>
                  <Cell dataKey="esimLabel" />
                </Column>

                <Column width={W.md}>
                  <HeaderCell>Network Type</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => row.networkType ?? '-'}
                  </Cell>
                </Column>

                <Column width={W.md}>
                  <HeaderCell>Specification</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => row.specification ?? '-'}
                  </Cell>
                </Column>

                <Column width={W.md} align="right">
                  <HeaderCell>Settlement Price</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => (
                      <span style={{ color: '#8a8d94' }}>{formatRp(row.settlementPrice)}</span>
                    )}
                  </Cell>
                </Column>

                <Column width={W.md} align="right" fixed="right">
                  <HeaderCell>Partner Price</HeaderCell>
                  <Cell>
                    {(row: PartnerPackageConfig) => formatRp(row.partnerPrice)}
                  </Cell>
                </Column>
              </Table>
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
              {skuSearch || countryFilter
                ? `Showing ${filteredPackages.length} of ${packages.length} packages`
                : `${packages.length} package${packages.length !== 1 ? 's' : ''} configured`}
            </p>
          </Tabs.Tab>

          {/* ── Upload History tab ── */}
          <Tabs.Tab
            eventKey="history"
            title={
              <span>
                Upload History
                {hasPendingUpload && (
                  <Tag
                    size="sm"
                    style={{
                      background: 'rgba(244,180,0,0.5)',
                      color: '#fff',
                      marginLeft: 8,
                      fontSize: 11,
                      padding: '1px 6px',
                      verticalAlign: 'middle',
                    }}
                  >
                    Pending
                  </Tag>
                )}
              </span>
            }
          >
            <div style={{ marginTop: 16 }}>
              {partnerHistory.length === 0 ? (
                <p style={{ color: '#8a8d94', fontSize: 14 }}>
                  No uploads yet for this partner.
                </p>
              ) : (
                <Table
                  data={partnerHistory}
                  autoHeight
                  bordered
                  cellBordered
                  rowHeight={52}
                  headerHeight={44}
                >
                  <Column flexGrow={1} minWidth={160}>
                    <HeaderCell>Date Uploaded</HeaderCell>
                    <Cell>
                      {(row) => formatTs(row.uploadedAt)}
                    </Cell>
                  </Column>

                  <Column flexGrow={1} minWidth={160}>
                    <HeaderCell>Activation Time</HeaderCell>
                    <Cell>
                      {(row) =>
                        row.activationAt === 'immediate'
                          ? <span style={{ color: '#8a8d94' }}>Immediate</span>
                          : formatTs(row.activationAt as string)
                      }
                    </Cell>
                  </Column>

                  <Column width={120} align="center">
                    <HeaderCell>Status</HeaderCell>
                    <Cell>
                      {(row) => {
                        const colours: Record<string, string> = {
                          pending: 'rgba(244,180,0,0.5)',
                          applied: 'rgba(14,205,194,0.5)',
                          cancelled: 'rgba(128,128,128,0.5)',
                        }
                        const labels: Record<string, string> = {
                          pending: 'Pending',
                          applied: 'Applied',
                          cancelled: 'Cancelled',
                        }
                        return (
                          <Tag style={{ background: colours[row.status], color: '#fff' }}>
                            {labels[row.status]}
                          </Tag>
                        )
                      }}
                    </Cell>
                  </Column>

                  <Column width={150} align="center">
                    <HeaderCell>Download SKU</HeaderCell>
                    <Cell>
                      {(row) => (
                        <Button
                          size="xs"
                          appearance="ghost"
                          onClick={() => downloadFromHistory(row.id, row.fileName)}
                        >
                          Download
                        </Button>
                      )}
                    </Cell>
                  </Column>

                  <Column width={110} align="center">
                    <HeaderCell>Action</HeaderCell>
                    <Cell>
                      {(row) =>
                        row.status === 'pending' ? (
                          <Button
                            size="xs"
                            appearance="subtle"
                            onClick={() => handleOpenCancelModal(row.id)}
                            style={{ color: '#f44336' }}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span style={{ color: '#555', fontSize: 13 }}>—</span>
                        )
                      }
                    </Cell>
                  </Column>
                </Table>
              )}
            </div>
          </Tabs.Tab>
        </Tabs>
      </div>

      {/* ── Cancel Upload Modal ───────────────────────────────────────────── */}
      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} size="xs">
        <Modal.Header>
          <Modal.Title>Cancel Scheduled Upload</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: 14, color: '#c0c3ca' }}>
            Are you sure you want to cancel this scheduled upload? This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={handleConfirmCancel}
            appearance="primary"
            style={{ background: '#f44336', color: '#fff' }}
          >
            Confirm Cancel
          </Button>
          <Button onClick={() => setCancelModalOpen(false)} appearance="subtle">
            Dismiss
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Add Row Drawer ─────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onClose={handleCloseDrawer} placement="right" size="sm">
        <Drawer.Header>
          <Drawer.Title>Add Row</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Form fluid>
              {/* SKU */}
              <Form.Group>
                <Form.ControlLabel>SKU <span style={{ color: '#f44336' }}>*</span></Form.ControlLabel>
                <SelectPicker
                  data={skuOptions}
                  value={selectedSku}
                  onChange={(val) => {
                    setSelectedSku(val)
                    setErrors((prev) => { const n = { ...prev }; delete n.sku; return n })
                  }}
                  block
                  searchable
                  placeholder="Search and select a SKU"
                />
                {errors.sku && (
                  <Form.HelpText style={{ color: '#f44336' }}>{errors.sku}</Form.HelpText>
                )}
              </Form.Group>

              {/* Read-only auto-filled fields */}
              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>Vendor</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#fff' : '#555', padding: '7px 0' }}>
                  {selectedCatalog?.vendor ?? '—'}
                </div>
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>eSIM Label</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#fff' : '#555', padding: '7px 0' }}>
                  {selectedCatalog?.esimLabel ?? '—'}
                </div>
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>Country Package</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#fff' : '#555', padding: '7px 0' }}>
                  {selectedCatalog?.country ?? '—'}
                </div>
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>Country Sub Package</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#fff' : '#555', padding: '7px 0' }}>
                  {selectedCatalog
                    ? (selectedCatalog.countryRegion?.join(', ') || '—')
                    : '—'}
                </div>
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>Package Name</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#fff' : '#555', padding: '7px 0' }}>
                  {selectedCatalog ? toTitleCase(selectedCatalog.packageSpec) : '—'}
                </div>
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel style={{ color: '#8a8d94' }}>Settlement Price</Form.ControlLabel>
                <div style={{ fontSize: 14, color: selectedCatalog ? '#8a8d94' : '#555', padding: '7px 0' }}>
                  {selectedCatalog ? formatRp(selectedCatalog.settlementPrice) : '—'}
                </div>
              </Form.Group>

              {/* Partner Price — editable */}
              <Form.Group>
                <Form.ControlLabel>
                  Partner Price (IDR) <span style={{ color: '#f44336' }}>*</span>
                </Form.ControlLabel>
                <InputNumber
                  value={partnerPrice}
                  onChange={(val) => {
                    setPartnerPrice(val ?? '')
                    setErrors((prev) => { const n = { ...prev }; delete n.partnerPrice; return n })
                  }}
                  min={1}
                  step={100}
                  placeholder="Enter partner price"
                  style={{ width: '100%' }}
                />
                {errors.partnerPrice && (
                  <Form.HelpText style={{ color: '#f44336' }}>{errors.partnerPrice}</Form.HelpText>
                )}
              </Form.Group>
            </Form>
          </div>

          {/* Pinned footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #2e3138',
            flexShrink: 0,
          }}>
            <Stack spacing={8} justifyContent="flex-end">
              <Button
                appearance="primary"
                onClick={handleAdd}
                style={{ background: '#0ecdc2', color: '#000' }}
              >
                Add
              </Button>
              <Button appearance="subtle" onClick={handleCloseDrawer}>
                Cancel
              </Button>
            </Stack>
          </div>
        </Drawer.Body>
      </Drawer>
      {/* ── Upload CSV Drawer ──────────────────────────────────────────────── */}
      <Drawer open={uploadOpen} onClose={handleCloseUploadDrawer} placement="right" size="md">
        <Drawer.Header>
          <Drawer.Title>Upload CSV</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) parseCsvFile(file)
                e.target.value = ''
              }}
            />

            {/* ── Idle: drop zone ── */}
            {uploadPhase === 'idle' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) parseCsvFile(file)
                }}
                style={{
                  border: '1px dashed #3c3f48',
                  borderRadius: 8,
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ color: '#8a8d94', marginBottom: 8, fontSize: 14 }}>
                  Click or drag a CSV file here to upload.
                </p>
                <p style={{ color: '#555', fontSize: 13 }}>
                  Expected columns:{' '}
                  <code style={{ background: '#2a2d35', padding: '2px 6px', borderRadius: 3 }}>sku</code>
                  {' '}and{' '}
                  <code style={{ background: '#2a2d35', padding: '2px 6px', borderRadius: 3 }}>partnerPrice</code>
                </p>
              </div>
            )}

            {/* ── Parsed: preview table ── */}
            {uploadPhase === 'parsed' && (
              <>
                <p style={{ fontSize: 13, color: '#8a8d94', marginBottom: 16 }}>{uploadFileName}</p>

                {/* Error code legend */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid #2e3138',
                  borderRadius: 6,
                  padding: '12px 16px',
                  marginBottom: 16,
                }}>
                  <p style={{ fontSize: 12, color: '#8a8d94', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Error Codes</p>
                  {[
                    { code: 'ERR_001', desc: 'SKU not found in master catalog' },
                    { code: 'ERR_002', desc: 'Partner price is missing, empty, or not a valid positive number' },
                    { code: 'ERR_003', desc: 'Row could not be parsed' },
                    { code: 'ERR_004', desc: 'Duplicate SKU — same SKU appears more than once in this file' },
                  ].map(({ code, desc }) => (
                    <div key={code} style={{ display: 'flex', gap: 12, marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: '#f44336', fontFamily: 'monospace', flexShrink: 0 }}>{code}</span>
                      <span style={{ color: '#8a8d94' }}>{desc}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 13, marginBottom: 16 }}>
                  <span style={{ color: '#0ecdc2' }}>
                    {parsedRows.filter((r) => r.status === 'valid').length} valid
                  </span>
                  {' · '}
                  <span style={{ color: '#f44336' }}>
                    {parsedRows.filter((r) => r.status === 'invalid').length} invalid
                  </span>
                </p>
                <Table
                  data={parsedRows}
                  autoHeight
                  bordered
                  cellBordered
                  rowHeight={44}
                  headerHeight={40}
                >
                  <Column width={60}>
                    <HeaderCell>Row #</HeaderCell>
                    <Cell dataKey="rowNum" />
                  </Column>
                  <Column flexGrow={2} minWidth={120}>
                    <HeaderCell>SKU</HeaderCell>
                    <Cell>
                      {(row: CsvRow) => (
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: row.status === 'invalid' ? '#f44336' : undefined,
                        }}>
                          {row.sku || '—'}
                        </span>
                      )}
                    </Cell>
                  </Column>
                  <Column width={130} align="right">
                    <HeaderCell>Partner Price</HeaderCell>
                    <Cell>
                      {(row: CsvRow) => (
                        <span style={{ color: row.status === 'invalid' ? '#f44336' : undefined }}>
                          {row.partnerPrice || '—'}
                        </span>
                      )}
                    </Cell>
                  </Column>
                  <Column width={110} align="center">
                    <HeaderCell>Status</HeaderCell>
                    <Cell>
                      {(row: CsvRow) =>
                        row.status === 'valid'
                          ? <Tag style={{ background: 'rgba(76,175,80,0.5)', color: '#fff' }}>Valid</Tag>
                          : <Tag style={{ background: 'rgba(244,67,54,0.5)', color: '#fff' }}>{row.errorCode}</Tag>
                      }
                    </Cell>
                  </Column>
                </Table>
              </>
            )}

            {/* ── Scheduling ── */}
            {uploadPhase === 'scheduling' && (
              <div>
                <p style={{ fontSize: 14, color: '#8a8d94', marginBottom: 20 }}>
                  <strong style={{ color: '#0ecdc2' }}>
                    {parsedRows.filter((r) => r.status === 'valid').length}
                  </strong>{' '}
                  valid row{parsedRows.filter((r) => r.status === 'valid').length !== 1 ? 's' : ''} ready.{' '}
                  {parsedRows.filter((r) => r.status === 'invalid').length > 0 && (
                    <span style={{ color: '#f44336' }}>
                      {parsedRows.filter((r) => r.status === 'invalid').length} invalid row{parsedRows.filter((r) => r.status === 'invalid').length !== 1 ? 's' : ''} will be skipped.
                    </span>
                  )}
                </p>

                <div style={{
                  background: 'rgba(244,180,0,0.08)',
                  border: '1px solid rgba(244,180,0,0.3)',
                  borderRadius: 6,
                  padding: '12px 16px',
                  marginBottom: 24,
                  fontSize: 13,
                  color: '#c8a800',
                }}>
                  ⚠ This is a <strong>full replacement</strong>. Any SKU currently in this partner's catalogue
                  that is not in the uploaded file will be removed on activation.
                </div>

                <Form fluid>
                  <Form.Group>
                    <Form.ControlLabel style={{ marginBottom: 12, fontSize: 14 }}>
                      Activation Timing
                    </Form.ControlLabel>
                    <RadioGroup
                      value={scheduleMode}
                      onChange={(val) => setScheduleMode(val as 'immediate' | 'scheduled')}
                    >
                      <Radio value="immediate" style={{ marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>Immediate</div>
                          <div style={{ fontSize: 12, color: '#8a8d94' }}>
                            Full replacement goes live the moment you confirm.
                          </div>
                        </div>
                      </Radio>
                      <Radio value="scheduled">
                        <div>
                          <div style={{ fontWeight: 500 }}>Schedule for Later</div>
                          <div style={{ fontSize: 12, color: '#8a8d94' }}>
                            Set a future date and time (minimum 1 hour from now).
                          </div>
                        </div>
                      </Radio>
                    </RadioGroup>
                  </Form.Group>

                  {scheduleMode === 'scheduled' && (
                    <Form.Group style={{ marginTop: 16 }}>
                      <Form.ControlLabel>
                        Activation Date & Time <span style={{ color: '#f44336' }}>*</span>
                      </Form.ControlLabel>
                      <DatePicker
                        format="yyyy-MM-dd HH:mm"
                        value={scheduleDate}
                        onChange={(date) => {
                          setScheduleDate(date)
                          setScheduleDateError('')
                        }}
                        shouldDisableDate={(date) => {
                          if (!date) return false
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          return date < today
                        }}
                        block
                        placeholder="Select activation date and time"
                      />
                      {scheduleDateError && (
                        <Form.HelpText style={{ color: '#f44336', marginTop: 4 }}>
                          {scheduleDateError}
                        </Form.HelpText>
                      )}
                    </Form.Group>
                  )}
                </Form>
              </div>
            )}

            {/* ── Result ── */}
            {uploadPhase === 'result' && uploadResult && (
              <div>
                {scheduleMode === 'immediate' ? (
                  <div style={{
                    background: 'rgba(14,205,194,0.08)',
                    border: '1px solid rgba(14,205,194,0.3)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#0ecdc2',
                  }}>
                    ✓ Full replacement applied immediately.
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(244,180,0,0.08)',
                    border: '1px solid rgba(244,180,0,0.3)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#c8a800',
                  }}>
                    ⏱ Upload scheduled. It will go live at{' '}
                    <strong>{scheduleDate ? scheduleDate.toLocaleString() : '—'}</strong>.
                    You can cancel it from the Upload History tab.
                  </div>
                )}
                <p style={{ fontSize: 15, marginBottom: 20 }}>
                  <strong style={{ color: '#0ecdc2' }}>{uploadResult.updated}</strong>{' '}
                  row{uploadResult.updated !== 1 ? 's' : ''} {scheduleMode === 'immediate' ? 'applied' : 'queued'}.{' '}
                  <strong style={{ color: uploadResult.rejected > 0 ? '#f44336' : '#aaa' }}>
                    {uploadResult.rejected}
                  </strong>{' '}
                  row{uploadResult.rejected !== 1 ? 's' : ''} rejected.
                </p>
                {uploadResult.rejected > 0 && (
                  <Button appearance="ghost" onClick={downloadErrorReport}>
                    Download Error Report
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Pinned footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #2e3138', flexShrink: 0 }}>
            <Stack spacing={8} justifyContent="flex-end">
              {uploadPhase === 'result' ? (
                <Button
                  appearance="primary"
                  style={{ background: '#0ecdc2', color: '#000' }}
                  onClick={handleCloseUploadDrawer}
                >
                  Done
                </Button>
              ) : uploadPhase === 'scheduling' ? (
                <>
                  <Button
                    appearance="primary"
                    style={{ background: '#0ecdc2', color: '#000' }}
                    onClick={handleConfirmUpload}
                  >
                    {scheduleMode === 'immediate' ? 'Confirm & Apply Now' : 'Confirm & Schedule'}
                  </Button>
                  <Button appearance="subtle" onClick={() => setUploadPhase('parsed')}>
                    Back
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    appearance="primary"
                    style={{ background: '#0ecdc2', color: '#000' }}
                    disabled={uploadPhase === 'parsed' && parsedRows.filter((r) => r.status === 'valid').length === 0}
                    onClick={uploadPhase === 'idle'
                      ? () => fileInputRef.current?.click()
                      : handleProceedToSchedule}
                  >
                    {uploadPhase === 'idle' ? 'Select CSV File' : 'Next: Set Activation'}
                  </Button>
                  {uploadPhase === 'parsed' && parsedRows.some((r) => r.status === 'invalid') && (
                    <Button appearance="ghost" onClick={downloadErrorReport}>
                      Download Error Report
                    </Button>
                  )}
                  <Button appearance="subtle" onClick={handleCloseUploadDrawer}>
                    Cancel
                  </Button>
                </>
              )}
            </Stack>
          </div>
        </Drawer.Body>
      </Drawer>
    </div>
  )
}
