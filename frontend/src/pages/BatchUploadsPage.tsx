import { Table } from 'rsuite'
import { coinGrants } from '../data/coinGrants'

const { Column, HeaderCell, Cell } = Table

// ── Derive batch summaries from coinGrants ────────────────────────────────────

interface BatchSummary {
  batchId: string
  uploadedAt: string
  uploadedBy: string
  grantCount: number
  totalCoins: number
}

const batchMap = new Map<string, BatchSummary>()

for (const grant of coinGrants) {
  if (!grant.batchId) continue
  const existing = batchMap.get(grant.batchId)
  if (existing) {
    existing.grantCount++
    existing.totalCoins += grant.amount
  } else {
    batchMap.set(grant.batchId, {
      batchId: grant.batchId,
      uploadedAt: grant.timestamp,
      uploadedBy: grant.grantedBy,
      grantCount: 1,
      totalCoins: grant.amount,
    })
  }
}

const batchSummaries: BatchSummary[] = Array.from(batchMap.values()).sort(
  (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
)

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function BatchUploadsPage() {
  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px' }}>Batch Uploads</h1>

      {/* Table */}
      <Table
        data={batchSummaries}
        autoHeight
        bordered
        cellBordered
        rowHeight={48}
        headerHeight={44}
      >
        <Column flexGrow={1}>
          <HeaderCell>Batch ID</HeaderCell>
          <Cell dataKey="batchId" />
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Uploaded At</HeaderCell>
          <Cell>
            {(rowData: BatchSummary) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTimestamp(rowData.uploadedAt)}
              </span>
            )}
          </Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Uploaded By</HeaderCell>
          <Cell dataKey="uploadedBy" />
        </Column>

        <Column width={100} align="right">
          <HeaderCell>Grants</HeaderCell>
          <Cell>
            {(rowData: BatchSummary) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{rowData.grantCount}</span>
            )}
          </Cell>
        </Column>

        <Column width={130} align="right">
          <HeaderCell>Total Coins</HeaderCell>
          <Cell>
            {(rowData: BatchSummary) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${rowData.totalCoins.toFixed(2)}
              </span>
            )}
          </Cell>
        </Column>
      </Table>

      <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
        {batchSummaries.length} batch{batchSummaries.length !== 1 ? 'es' : ''}
      </p>
    </div>
  )
}
