import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Tag, Stack, SelectPicker, DateRangePicker, AutoComplete,
  Drawer, Form, InputNumber, Modal, Divider,
} from 'rsuite'
import type { DateRange } from 'rsuite/esm/DateRangePicker'
import { coinGrants as initialGrants } from '../data/coinGrants'
import { coinTransactions as initialTransactions } from '../data/coinTransactions'
import { grantReasons } from '../data/grantReasons'
import type { CoinGrant, CoinTransaction } from '../types'

const { Column, HeaderCell, Cell } = Table

// Reason lookups
const reasonLabelById: Record<string, string> = Object.fromEntries(
  grantReasons.map((r) => [r.id, r.label])
)
const reasonIdByLabelLower: Record<string, string> = Object.fromEntries(
  grantReasons.map((r) => [r.label.toLowerCase(), r.id])
)
const reasonOptions = grantReasons.map((r) => ({ label: r.label, value: r.id }))

// Known user IDs sourced from transactions
const knownUserIds = Array.from(new Set(initialTransactions.map((t) => t.userId))).sort()
const userIdPickerOptions = knownUserIds.map((id) => ({ label: id, value: id }))

// Batch ID options — unique non-null batch IDs from grants, plus a sentinel for unbatched
const batchIdOptions = [
  { label: 'No batch (singular)', value: '__none__' },
  ...Array.from(new Set(initialGrants.map((g) => g.batchId).filter(Boolean)))
    .sort()
    .map((id) => ({ label: id as string, value: id as string })),
]

// ── Local types ──────────────────────────────────────────────────────────────

interface ParsedCsvRow {
  rowNum: number
  userId: string
  rawAmount: string
  rawReason: string
  valid: boolean
  resolvedAmount?: number
  resolvedReasonId?: string
  failureReason?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function generateGrantId(count: number): string {
  return `GRT-${String(count).padStart(3, '0')}`
}

function generateTxnId(count: number): string {
  return `TXN-${String(count).padStart(4, '0')}`
}

function generateBatchId(existingGrants: CoinGrant[]): string {
  const nums = existingGrants
    .filter((g) => g.batchId)
    .map((g) => {
      const m = g.batchId?.match(/BATCH-(\d+)/)
      return m ? parseInt(m[1]) : 0
    })
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `BATCH-${String(max + 1).padStart(3, '0')}`
}

function parseCsv(text: string): ParsedCsvRow[] | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length < 2) return null

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim())
  const userIdIdx = header.indexOf('userid')
  const amountIdx = header.indexOf('amount')
  const reasonIdx = header.indexOf('reason')

  if (userIdIdx === -1 || amountIdx === -1 || reasonIdx === -1) return null

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map((c) => c.trim())
    const userId = cols[userIdIdx] ?? ''
    const rawAmount = cols[amountIdx] ?? ''
    const rawReason = cols[reasonIdx] ?? ''
    const rowNum = i + 2 // header = row 1

    const amount = parseFloat(rawAmount)
    const userValid = knownUserIds.includes(userId)
    const amountValid = !isNaN(amount) && amount > 0

    // Resolve reason: exact ID match, then case-insensitive label match
    const resolvedReasonId =
      reasonLabelById[rawReason] !== undefined
        ? rawReason
        : reasonIdByLabelLower[rawReason.toLowerCase()]
    const reasonValid = !!resolvedReasonId

    const failures: string[] = []
    if (!userValid) failures.push('Unknown user ID')
    if (!amountValid) failures.push('Invalid amount (must be > 0)')
    if (!reasonValid) failures.push('Unknown reason')

    return {
      rowNum,
      userId,
      rawAmount,
      rawReason,
      valid: userValid && amountValid && reasonValid,
      resolvedAmount: amountValid ? amount : undefined,
      resolvedReasonId,
      failureReason: failures.join('; ') || undefined,
    }
  })
}

const MOCK_ADMIN = 'Admin Sarah'

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoinGrantsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Table state — lifted so new grants can be prepended
  const [grants, setGrants] = useState<CoinGrant[]>(initialGrants)
  const [transactions, setTransactions] = useState<CoinTransaction[]>(initialTransactions)

  // Filter state
  const [userIdFilter, setUserIdFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState<string | null>(null)
  const [batchIdFilter, setBatchIdFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)

  // ── Single grant drawer ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formAmount, setFormAmount] = useState<string | number>('')
  const [formReasonId, setFormReasonId] = useState<string | null>(null)
  const [userIdError, setUserIdError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [singleConfirmOpen, setSingleConfirmOpen] = useState(false)
  const [pendingGrant, setPendingGrant] = useState<{ userId: string; amount: number; reasonId: string } | null>(null)

  // ── Bulk upload modal ──────────────────────────────────────────────────────
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [csvStep, setCsvStep] = useState<'upload' | 'results'>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([])
  const [csvParseError, setCsvParseError] = useState('')
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkResults, setBulkResults] = useState<{ succeeded: CoinGrant[]; failed: ParsedCsvRow[] } | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = grants
    .filter((grant) => {
      if (userIdFilter && !grant.userId.toLowerCase().includes(userIdFilter.toLowerCase())) return false
      if (reasonFilter && grant.reasonId !== reasonFilter) return false
      if (batchIdFilter) {
        if (batchIdFilter === '__none__' && grant.batchId !== null) return false
        if (batchIdFilter !== '__none__' && grant.batchId !== batchIdFilter) return false
      }
      if (dateRange) {
        const ts = new Date(grant.timestamp).getTime()
        const [start, end] = dateRange
        if (ts < start.getTime() || ts > end.getTime()) return false
      }
      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // ── Single grant handlers ──────────────────────────────────────────────────

  function openDrawer() {
    setFormUserId('')
    setFormAmount('')
    setFormReasonId(null)
    setUserIdError('')
    setAmountError('')
    setReasonError('')
    setDrawerOpen(true)
  }

  function validateAndOpenConfirm() {
    let valid = true
    if (!formUserId.trim()) {
      setUserIdError('Please select a user.')
      valid = false
    } else {
      setUserIdError('')
    }
    const parsedAmount = typeof formAmount === 'string' ? parseFloat(formAmount) : formAmount
    if (!formAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Amount must be greater than $0.')
      valid = false
    } else {
      setAmountError('')
    }
    if (!formReasonId) {
      setReasonError('Please select a reason.')
      valid = false
    } else {
      setReasonError('')
    }
    if (!valid) return
    setPendingGrant({ userId: formUserId.trim(), amount: parsedAmount, reasonId: formReasonId! })
    setSingleConfirmOpen(true)
  }

  function handleSingleConfirm() {
    if (!pendingGrant) return
    const now = new Date().toISOString()
    const newGrantId = generateGrantId(grants.length + 1)
    const newTxnId = generateTxnId(transactions.length + 1)

    const newGrant: CoinGrant = {
      id: newGrantId,
      userId: pendingGrant.userId,
      amount: pendingGrant.amount,
      reasonId: pendingGrant.reasonId,
      grantedBy: MOCK_ADMIN,
      timestamp: now,
      transactionId: newTxnId,
      batchId: null,
    }
    const newTxn: CoinTransaction = {
      id: newTxnId,
      userId: pendingGrant.userId,
      type: 'granted',
      amount: pendingGrant.amount,
      referenceType: 'grant',
      referenceId: newGrantId,
      timestamp: now,
      balanceAfter: 0,
      expiryDate: null,
    }
    setGrants((prev) => [newGrant, ...prev])
    setTransactions((prev) => [newTxn, ...prev])
    setSingleConfirmOpen(false)
    setDrawerOpen(false)
    setPendingGrant(null)
  }

  const confirmReasonLabel = pendingGrant ? (reasonLabelById[pendingGrant.reasonId] ?? pendingGrant.reasonId) : ''

  // ── Bulk upload handlers ───────────────────────────────────────────────────

  function openUploadModal() {
    setCsvStep('upload')
    setParsedRows([])
    setCsvParseError('')
    setBulkResults(null)
    setUploadModalOpen(true)
  }

  function closeUploadModal() {
    setUploadModalOpen(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const rows = parseCsv(text)
      if (!rows) {
        setCsvParseError('Could not parse CSV. Ensure it has headers: userId, amount, reason.')
        setParsedRows([])
        return
      }
      setCsvParseError('')
      setParsedRows(rows)
    }
    reader.readAsText(file)
  }

  function handleBulkConfirm() {
    const now = new Date().toISOString()
    const batchId = generateBatchId(grants)
    const validRows = parsedRows.filter((r) => r.valid)
    const failedRows = parsedRows.filter((r) => !r.valid)

    let grantCount = grants.length
    let txnCount = transactions.length
    const newGrants: CoinGrant[] = []
    const newTxns: CoinTransaction[] = []

    for (const row of validRows) {
      grantCount++
      txnCount++
      const grantId = generateGrantId(grantCount)
      const txnId = generateTxnId(txnCount)

      newGrants.push({
        id: grantId,
        userId: row.userId,
        amount: row.resolvedAmount!,
        reasonId: row.resolvedReasonId!,
        grantedBy: MOCK_ADMIN,
        timestamp: now,
        transactionId: txnId,
        batchId,
      })
      newTxns.push({
        id: txnId,
        userId: row.userId,
        type: 'granted',
        amount: row.resolvedAmount!,
        referenceType: 'grant',
        referenceId: grantId,
        timestamp: now,
        balanceAfter: 0,
        expiryDate: null,
      })
    }

    setGrants((prev) => [...newGrants, ...prev])
    setTransactions((prev) => [...newTxns, ...prev])
    setBulkResults({ succeeded: newGrants, failed: failedRows })
    setBulkConfirmOpen(false)
    setCsvStep('results')
  }

  const validCount = parsedRows.filter((r) => r.valid).length
  const invalidRows = parsedRows.filter((r) => !r.valid)
  const invalidCount = invalidRows.length
  const previewRows = parsedRows.slice(0, 5)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Coin Grants</h1>
        <Stack spacing={8}>
          <Button appearance="default" onClick={openUploadModal}>
            Bulk Upload
          </Button>
          <Button
            appearance="primary"
            onClick={openDrawer}
            style={{ background: '#0ecdc2', color: '#000' }}
          >
            New Grant
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack wrap spacing={12} style={{ marginBottom: 16 }}>
        <AutoComplete
          data={knownUserIds}
          placeholder="Filter by User ID"
          value={userIdFilter}
          onChange={(val) => setUserIdFilter(val)}
          style={{ width: 200 }}
        />
        <SelectPicker
          data={reasonOptions}
          placeholder="Filter by Reason"
          value={reasonFilter}
          onChange={(val) => setReasonFilter(val)}
          cleanable
          style={{ width: 220 }}
        />
        <SelectPicker
          data={batchIdOptions}
          placeholder="Filter by Batch ID"
          value={batchIdFilter}
          onChange={(val) => setBatchIdFilter(val)}
          cleanable
          style={{ width: 200 }}
        />
        <DateRangePicker
          placeholder="Date range"
          value={dateRange}
          onChange={(val) => setDateRange(val)}
          style={{ width: 260 }}
        />
      </Stack>

      {/* Table */}
      <Table data={filtered} autoHeight bordered cellBordered rowHeight={48} headerHeight={44}>
        <Column flexGrow={1} fixed>
          <HeaderCell>Grant ID</HeaderCell>
          <Cell dataKey="id" />
        </Column>
        <Column flexGrow={1}>
          <HeaderCell>User ID</HeaderCell>
          <Cell dataKey="userId" />
        </Column>
        <Column width={100} align="right">
          <HeaderCell>Amount</HeaderCell>
          <Cell>
            {(rowData: CoinGrant) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>${rowData.amount.toFixed(2)}</span>
            )}
          </Cell>
        </Column>
        <Column flexGrow={2}>
          <HeaderCell>Reason</HeaderCell>
          <Cell>{(rowData: CoinGrant) => reasonLabelById[rowData.reasonId] ?? rowData.reasonId}</Cell>
        </Column>
        <Column flexGrow={1}>
          <HeaderCell>Granted By</HeaderCell>
          <Cell dataKey="grantedBy" />
        </Column>
        <Column flexGrow={1}>
          <HeaderCell>Date & Time</HeaderCell>
          <Cell>
            {(rowData: CoinGrant) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTimestamp(rowData.timestamp)}</span>
            )}
          </Cell>
        </Column>
        <Column flexGrow={1}>
          <HeaderCell>Batch ID</HeaderCell>
          <Cell>
            {(rowData: CoinGrant) =>
              rowData.batchId ? (
                <Tag style={{ fontSize: 12, opacity: 0.5 }}>{rowData.batchId}</Tag>
              ) : (
                <span style={{ color: '#555' }}>—</span>
              )
            }
          </Cell>
        </Column>
      </Table>

      <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
        Showing {filtered.length} of {grants.length} grants
      </p>

      {/* ── New Grant Drawer ──────────────────────────────────────────────── */}
      <Drawer placement="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} size="xs">
        <Drawer.Header>
          <Drawer.Title>New Grant</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Form fluid>
              <Form.Group>
                <Form.ControlLabel>User ID</Form.ControlLabel>
                <SelectPicker
                  data={userIdPickerOptions}
                  value={formUserId || null}
                  onChange={(val) => { setFormUserId(val ?? ''); if (userIdError) setUserIdError('') }}
                  placeholder="Search user ID..."
                  cleanable
                  block
                />
                {userIdError && <Form.HelpText style={{ color: '#f44336' }}>{userIdError}</Form.HelpText>}
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel>Coin Amount (USD)</Form.ControlLabel>
                <InputNumber
                  value={formAmount}
                  onChange={(val) => { setFormAmount(val); if (amountError) setAmountError('') }}
                  min={0.01}
                  step={0.01}
                  prefix="$"
                  placeholder="0.00"
                  style={{ width: '100%' }}
                />
                {amountError && <Form.HelpText style={{ color: '#f44336' }}>{amountError}</Form.HelpText>}
              </Form.Group>

              <Form.Group>
                <Form.ControlLabel>Reason</Form.ControlLabel>
                <SelectPicker
                  data={reasonOptions}
                  value={formReasonId}
                  onChange={(val) => { setFormReasonId(val); if (reasonError) setReasonError('') }}
                  placeholder="Select a reason"
                  cleanable
                  block
                />
                {reasonError && <Form.HelpText style={{ color: '#f44336' }}>{reasonError}</Form.HelpText>}
                <Form.HelpText style={{ marginTop: 6 }}>
                  Don&apos;t see the reason?{' '}
                  <span
                    onClick={() => { setDrawerOpen(false); navigate('/coins/grant-reasons') }}
                    style={{ color: '#0ecdc2', cursor: 'pointer' }}
                  >
                    Create new reason →
                  </span>
                </Form.HelpText>
              </Form.Group>
            </Form>
          </div>

          {/* Pinned footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #2e3138', flexShrink: 0 }}>
            <Stack spacing={8}>
              <Button appearance="primary" onClick={validateAndOpenConfirm} style={{ background: '#0ecdc2', color: '#000' }}>
                Create Grant
              </Button>
              <Button appearance="subtle" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            </Stack>
          </div>
        </Drawer.Body>
      </Drawer>

      {/* ── Single grant confirmation modal ───────────────────────────────── */}
      <Modal open={singleConfirmOpen} onClose={() => setSingleConfirmOpen(false)} size="xs">
        <Modal.Header><Modal.Title>Confirm Grant</Modal.Title></Modal.Header>
        <Modal.Body>
          {pendingGrant && (
            <p style={{ lineHeight: 1.6 }}>
              Grant{' '}
              <strong style={{ color: '#0ecdc2' }}>${pendingGrant.amount.toFixed(2)} RoaminCoins</strong>{' '}
              to <strong>{pendingGrant.userId}</strong> for <strong>{confirmReasonLabel}</strong>?{' '}
              This action cannot be undone.
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleSingleConfirm} style={{ background: '#0ecdc2', color: '#000' }}>
            Confirm
          </Button>
          <Button appearance="subtle" onClick={() => setSingleConfirmOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Bulk Upload Drawer ────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Drawer placement="right" open={uploadModalOpen} onClose={closeUploadModal} size="sm">
        <Drawer.Header>
          <Drawer.Title>Bulk Upload Grants</Drawer.Title>
          <Button
            size="xs"
            appearance="subtle"
            onClick={() => {
              const template = 'userId,amount,reason\n'
              const blob = new Blob([template], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'grants-upload-template.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
            style={{ color: '#0ecdc2', marginLeft: 12, flexShrink: 0 }}
          >
            Download Template
          </Button>
        </Drawer.Header>

        {/* Flex column layout: scrollable content + pinned footer */}
        <Drawer.Body style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {csvStep === 'upload' && (
              <>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
                  Upload a <code>.csv</code> file with columns: <code>userId</code>, <code>amount</code>, <code>reason</code>.
                  Valid rows are processed; invalid rows are skipped.
                </p>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #3a3d46',
                    borderRadius: 8,
                    padding: '32px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: 16,
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0ecdc2')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3a3d46')}
                >
                  <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
                    Click to select a <strong>.csv</strong> file
                  </p>
                  {parsedRows.length > 0 && (
                    <p style={{ margin: '8px 0 0', color: '#0ecdc2', fontSize: 13 }}>
                      {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''} loaded —{' '}
                      {validCount} valid, {invalidCount} invalid
                    </p>
                  )}
                </div>

                {csvParseError && (
                  <p style={{ color: '#f44336', fontSize: 13, marginBottom: 12 }}>{csvParseError}</p>
                )}

                {/* Preview table */}
                {parsedRows.length > 0 && (
                  <>
                    <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                      Preview (first {Math.min(5, parsedRows.length)} rows):
                    </p>
                    <Table data={previewRows} autoHeight bordered cellBordered rowHeight={40} headerHeight={36}>
                      <Column width={60}>
                        <HeaderCell>Row</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.rowNum}</Cell>
                      </Column>
                      <Column flexGrow={1}>
                        <HeaderCell>User ID</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.userId || <span style={{ color: '#555' }}>—</span>}</Cell>
                      </Column>
                      <Column width={80} align="right">
                        <HeaderCell>Amount</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.rawAmount}</Cell>
                      </Column>
                      <Column flexGrow={1}>
                        <HeaderCell>Reason</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.rawReason || <span style={{ color: '#555' }}>—</span>}</Cell>
                      </Column>
                      <Column width={60} align="center">
                        <HeaderCell>Valid</HeaderCell>
                        <Cell>
                          {(r: ParsedCsvRow) => (
                            <span style={{ color: r.valid ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                              {r.valid ? '✓' : '✗'}
                            </span>
                          )}
                        </Cell>
                      </Column>
                    </Table>

                    {/* Invalid rows */}
                    {invalidCount > 0 && (
                      <>
                        <p style={{ fontSize: 13, color: '#f44336', margin: '16px 0 8px' }}>
                          {invalidCount} row{invalidCount !== 1 ? 's' : ''} will be skipped:
                        </p>
                        <Table data={invalidRows} autoHeight bordered cellBordered rowHeight={40} headerHeight={36}>
                          <Column width={60}>
                            <HeaderCell>Row</HeaderCell>
                            <Cell>{(r: ParsedCsvRow) => r.rowNum}</Cell>
                          </Column>
                          <Column flexGrow={1}>
                            <HeaderCell>User ID</HeaderCell>
                            <Cell>{(r: ParsedCsvRow) => r.userId || <span style={{ color: '#555' }}>—</span>}</Cell>
                          </Column>
                          <Column flexGrow={2}>
                            <HeaderCell>Reason for Skipping</HeaderCell>
                            <Cell>
                              {(r: ParsedCsvRow) => (
                                <span style={{ color: '#f44336', fontSize: 12 }}>{r.failureReason}</span>
                              )}
                            </Cell>
                          </Column>
                        </Table>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {csvStep === 'results' && bulkResults && (
              <>
                {bulkResults.failed.length === 0 ? (
                  <p style={{ color: '#4caf50', fontSize: 15, fontWeight: 600 }}>
                    ✓ {bulkResults.succeeded.length} grant{bulkResults.succeeded.length !== 1 ? 's' : ''} processed successfully.
                  </p>
                ) : bulkResults.succeeded.length === 0 ? (
                  <p style={{ color: '#f44336', fontSize: 15, fontWeight: 600 }}>
                    All {bulkResults.failed.length} rows failed. No grants were created.
                  </p>
                ) : (
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                    <span style={{ color: '#4caf50' }}>{bulkResults.succeeded.length}</span>
                    {' '}of{' '}
                    <span>{bulkResults.succeeded.length + bulkResults.failed.length}</span>
                    {' '}grants processed successfully.
                  </p>
                )}

                {bulkResults.failed.length > 0 && (
                  <>
                    <p style={{ fontSize: 13, color: '#888', marginTop: 16, marginBottom: 8 }}>
                      Failed rows ({bulkResults.failed.length}):
                    </p>
                    <Table data={bulkResults.failed} autoHeight bordered cellBordered rowHeight={40} headerHeight={36}>
                      <Column width={60}>
                        <HeaderCell>Row</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.rowNum}</Cell>
                      </Column>
                      <Column flexGrow={1}>
                        <HeaderCell>User ID</HeaderCell>
                        <Cell>{(r: ParsedCsvRow) => r.userId || <span style={{ color: '#555' }}>—</span>}</Cell>
                      </Column>
                      <Column flexGrow={2}>
                        <HeaderCell>Failure Reason</HeaderCell>
                        <Cell>
                          {(r: ParsedCsvRow) => (
                            <span style={{ color: '#f44336', fontSize: 12 }}>{r.failureReason}</span>
                          )}
                        </Cell>
                      </Column>
                    </Table>
                  </>
                )}
              </>
            )}
          </div>

          {/* Pinned footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #2e3138', flexShrink: 0 }}>
            {csvStep === 'upload' && (
              <Stack spacing={8}>
                <Button
                  appearance="primary"
                  disabled={parsedRows.length === 0 || validCount === 0}
                  onClick={() => setBulkConfirmOpen(true)}
                  style={parsedRows.length > 0 && validCount > 0 ? { background: '#0ecdc2', color: '#000' } : undefined}
                >
                  Confirm Upload
                </Button>
                <Button appearance="subtle" onClick={closeUploadModal}>Cancel</Button>
              </Stack>
            )}
            {csvStep === 'results' && (
              <Button appearance="primary" onClick={closeUploadModal} style={{ background: '#0ecdc2', color: '#000' }}>
                Done
              </Button>
            )}
          </div>
        </Drawer.Body>
      </Drawer>

      {/* ── Bulk confirmation modal ───────────────────────────────────────── */}
      <Modal open={bulkConfirmOpen} onClose={() => setBulkConfirmOpen(false)} size="xs">
        <Modal.Header><Modal.Title>Confirm Bulk Upload</Modal.Title></Modal.Header>
        <Modal.Body>
          <p style={{ lineHeight: 1.6 }}>
            Process <strong style={{ color: '#0ecdc2' }}>{validCount} grant{validCount !== 1 ? 's' : ''}</strong>?{' '}
            Valid rows will be added.
            {invalidCount > 0 && <> <strong>{invalidCount}</strong> invalid row{invalidCount !== 1 ? 's' : ''} will be skipped.</>}{' '}
            This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleBulkConfirm} style={{ background: '#0ecdc2', color: '#000' }}>
            Confirm
          </Button>
          <Button appearance="subtle" onClick={() => setBulkConfirmOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
