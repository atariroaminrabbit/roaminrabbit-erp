import { useParams, useNavigate } from 'react-router-dom'
import { Table, Button, Tag, Stack, Breadcrumb } from 'rsuite'
import { grantReasons } from '../data/grantReasons'
import { coinGrants } from '../data/coinGrants'
import type { CoinGrant } from '../types'

const { Column, HeaderCell, Cell } = Table

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function GrantReasonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const reason = grantReasons.find((r) => r.id === id)
  const grants = coinGrants.filter((g) => g.reasonId === id)

  if (!reason) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#888' }}>Reason not found.</p>
        <Button appearance="subtle" onClick={() => navigate('/coins/grant-reasons')}>
          Back to Grant Reasons
        </Button>
      </div>
    )
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 20, fontSize: 13 }}>
        <Breadcrumb.Item
          onClick={() => navigate('/coins/grant-reasons')}
          style={{ cursor: 'pointer', color: '#8a8d94' }}
        >
          Grant Reasons
        </Breadcrumb.Item>
        <Breadcrumb.Item active style={{ color: '#fff' }}>
          {reason.label}
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <Stack justifyContent="space-between" alignItems="flex-start" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>{reason.label}</h1>
          <span style={{ fontSize: 13, color: '#555' }}>ID: {reason.id} · Created {formatDate(reason.createdAt)}</span>
        </div>
        <Button
          appearance="subtle"
          onClick={() => navigate('/coins/grant-reasons')}
          style={{ color: '#8a8d94', flexShrink: 0 }}
        >
          ← Back
        </Button>
      </Stack>

      {/* Grants table */}
      <Table
        data={grants}
        autoHeight
        bordered
        cellBordered
        rowHeight={48}
        headerHeight={44}
      >
        <Column flexGrow={1} fixed>
          <HeaderCell>Grant ID</HeaderCell>
          <Cell dataKey="id" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>User ID</HeaderCell>
          <Cell dataKey="userId" />
        </Column>

        <Column flexGrow={1} align="right">
          <HeaderCell>Amount</HeaderCell>
          <Cell>
            {(rowData: CoinGrant) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${rowData.amount.toFixed(2)}
              </span>
            )}
          </Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Granted By</HeaderCell>
          <Cell dataKey="grantedBy" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Date & Time</HeaderCell>
          <Cell>
            {(rowData: CoinGrant) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTimestamp(rowData.timestamp)}
              </span>
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
        {grants.length} grant{grants.length !== 1 ? 's' : ''} under this reason
      </p>
    </div>
  )
}
