import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Modal, Stack } from 'rsuite'
import { getPartnerStore, setPartnerStore } from '../data/partners'
import { getPartnerPackageStore } from '../data/partnerPackages'
import type { Partner } from '../types'

const { Column, HeaderCell, Cell } = Table

export default function PartnersPage() {
  const navigate = useNavigate()
  const [partners, setPartners] = useState<Partner[]>(getPartnerStore)
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)

  function handleDelete() {
    if (!deleteTarget) return
    const updated = partners.filter((p) => p.id !== deleteTarget.id)
    setPartners(updated)
    setPartnerStore(updated)
    setDeleteTarget(null)
  }

  function hasPackages(partnerId: string): boolean {
    return getPartnerPackageStore().some((p) => p.partnerId === partnerId)
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <Stack justifyContent="space-between" alignItems="center" className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>Partner Management</h1>
        <Button
          appearance="primary"
          onClick={() => navigate('/partners/add')}
          style={{ background: '#0ecdc2', color: '#000' }}
        >
          Add Partner
        </Button>
      </Stack>

      {/* Table */}
      <Table
        data={partners}
        autoHeight
        bordered
        cellBordered
        rowHeight={48}
        headerHeight={44}
      >
        <Column flexGrow={2} minWidth={140}>
          <HeaderCell>Company Name</HeaderCell>
          <Cell dataKey="companyName" />
        </Column>

        <Column flexGrow={1} minWidth={120}>
          <HeaderCell>Contact Person Name</HeaderCell>
          <Cell dataKey="contactPersonName" />
        </Column>

        <Column flexGrow={2} minWidth={160}>
          <HeaderCell>Company Email</HeaderCell>
          <Cell dataKey="email" />
        </Column>

        <Column width={180} align="center">
          <HeaderCell>Partner Package Config</HeaderCell>
          <Cell>
            {(rowData: Partner) => (
              <Button
                appearance="ghost"
                size="xs"
                onClick={() => navigate(`/partners/${rowData.id}/packages`)}
              >
                {hasPackages(rowData.id) ? 'Edit' : '+'}
              </Button>
            )}
          </Cell>
        </Column>

        <Column width={220} align="center">
          <HeaderCell>Partner Account Config</HeaderCell>
          <Cell>
            {(rowData: Partner) => (
              <Stack spacing={6} justifyContent="center">
                <Button
                  appearance="ghost"
                  size="xs"
                  onClick={() => navigate(`/partners/${rowData.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  appearance="subtle"
                  size="xs"
                  style={{ color: '#f44336' }}
                  onClick={() => setDeleteTarget(rowData)}
                >
                  Delete
                </Button>
              </Stack>
            )}
          </Cell>
        </Column>
      </Table>

      <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
        Total Rows: {partners.length}
      </p>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="xs">
        <Modal.Header>
          <Modal.Title>Delete Partner</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{deleteTarget?.companyName}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="primary"
            onClick={handleDelete}
            style={{ background: '#f44336', color: '#fff' }}
          >
            Delete
          </Button>
          <Button appearance="subtle" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
