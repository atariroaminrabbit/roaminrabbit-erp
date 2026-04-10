import { useState } from 'react'
import { Table, SelectPicker, DateRangePicker, Tag, Stack, Panel } from 'rsuite'
import type { DateRange } from 'rsuite/esm/DateRangePicker'
import { coinTransactions } from '../data/coinTransactions'
import type { CoinTransaction, CoinTransactionType } from '../types'

const { Column, HeaderCell, Cell } = Table

const typeOptions = [
  { label: 'Earned', value: 'earned' },
  { label: 'Redeemed', value: 'redeemed' },
  { label: 'Granted', value: 'granted' },
]

const userIdOptions = Array.from(new Set(coinTransactions.map((t) => t.userId)))
  .sort()
  .map((id) => ({ label: id, value: id }))

const totalIssued = coinTransactions
  .filter((t) => t.type === 'earned')
  .reduce((sum, t) => sum + t.amount, 0)

const totalRedeemed = coinTransactions
  .filter((t) => t.type === 'redeemed')
  .reduce((sum, t) => sum + t.amount, 0)

const outstandingLiability = totalIssued - totalRedeemed
const effectiveDiscountRate = totalIssued > 0 ? (totalRedeemed / totalIssued) * 100 : 0

const summaryCards = [
  {
    label: 'Total Coins Issued',
    value: `$${totalIssued.toFixed(2)}`,
    sub: 'All-time coins earned by users',
  },
  {
    label: 'Total Coins Redeemed',
    value: `$${totalRedeemed.toFixed(2)}`,
    sub: 'All-time coins spent by users',
  },
  {
    label: 'Outstanding Liability',
    value: `$${outstandingLiability.toFixed(2)}`,
    sub: 'Unspent coins across all wallets',
  },
  {
    label: 'Effective Discount Rate',
    value: `${effectiveDiscountRate.toFixed(1)}%`,
    sub: 'Total redeemed ÷ total issued',
  },
]

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

export default function CoinTransactionsPage() {
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<CoinTransactionType | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)

  const filtered = coinTransactions
    .filter((txn) => {
      if (userIdFilter && txn.userId !== userIdFilter) return false
      if (typeFilter && txn.type !== typeFilter) return false
      if (dateRange) {
        const ts = new Date(txn.timestamp).getTime()
        const [start, end] = dateRange
        if (ts < start.getTime() || ts > end.getTime()) return false
      }
      return true
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Coin Management</h1>
      </Stack>

      {/* Summary cards */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {summaryCards.map((card) => (
          <Panel key={card.label} bordered style={{ flex: '1 1 180px' }}>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{card.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#0ecdc2', margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>
              {card.value}
            </p>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>{card.sub}</p>
          </Panel>
        ))}
      </div>

      {/* Filters */}
      <Stack wrap spacing={12} style={{ marginBottom: 16 }}>
        <SelectPicker
          data={userIdOptions}
          placeholder="Filter by User ID"
          value={userIdFilter}
          onChange={(val) => setUserIdFilter(val)}
          cleanable
          style={{ width: 200 }}
        />
        <SelectPicker
          data={typeOptions}
          placeholder="Transaction type"
          value={typeFilter}
          onChange={(val) => setTypeFilter(val as CoinTransactionType | null)}
          cleanable
          style={{ width: 180 }}
        />
        <DateRangePicker
          placeholder="Date range"
          value={dateRange}
          onChange={(val) => setDateRange(val)}
          style={{ width: 260 }}
        />
      </Stack>

      {/* Table */}
      <Table
        data={filtered}
        autoHeight
        bordered
        cellBordered
        rowHeight={48}
        headerHeight={44}
      >
        <Column flexGrow={1} fixed>
          <HeaderCell>Transaction ID</HeaderCell>
          <Cell dataKey="id" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>User ID</HeaderCell>
          <Cell dataKey="userId" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Type</HeaderCell>
          <Cell>
            {(rowData: CoinTransaction) => {
              const typeConfig: Record<string, { label: string; color: 'green' | 'orange' | 'cyan' }> = {
                earned: { label: 'Earned', color: 'green' },
                redeemed: { label: 'Redeemed', color: 'orange' },
                granted: { label: 'Granted', color: 'cyan' },
              }
              const config = typeConfig[rowData.type] ?? { label: rowData.type, color: 'cyan' }
              return (
                <Tag color={config.color} style={{ fontSize: 12, opacity: 0.5 }}>
                  {config.label}
                </Tag>
              )
            }}
          </Cell>
        </Column>

        <Column flexGrow={1} align="right">
          <HeaderCell>Amount</HeaderCell>
          <Cell>
            {(rowData: CoinTransaction) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${rowData.amount.toFixed(2)}
              </span>
            )}
          </Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Reference Type</HeaderCell>
          <Cell>
            {(rowData: CoinTransaction) => (
              <Tag style={{ fontSize: 12, opacity: 0.5 }}>
                {rowData.referenceType === 'grant' ? 'Grant' : 'Order'}
              </Tag>
            )}
          </Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Reference ID</HeaderCell>
          <Cell dataKey="referenceId" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Date & Time</HeaderCell>
          <Cell>
            {(rowData: CoinTransaction) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatTimestamp(rowData.timestamp)}
              </span>
            )}
          </Cell>
        </Column>

        <Column flexGrow={1} align="right">
          <HeaderCell>Running Balance</HeaderCell>
          <Cell>
            {(rowData: CoinTransaction) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                ${rowData.balanceAfter.toFixed(2)}
              </span>
            )}
          </Cell>
        </Column>
      </Table>

      <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
        Showing {filtered.length} of {coinTransactions.length} transactions
      </p>
    </div>
  )
}
