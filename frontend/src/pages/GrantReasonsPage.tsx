import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Modal, Form, Input, Stack } from 'rsuite'
import { grantReasons as initialReasons } from '../data/grantReasons'
import { coinGrants } from '../data/coinGrants'
import type { GrantReason } from '../types'

// Pre-compute grant counts per reason — used for column display and delete eligibility
const grantCountByReason: Record<string, number> = coinGrants.reduce<Record<string, number>>(
  (acc, grant) => {
    acc[grant.reasonId] = (acc[grant.reasonId] ?? 0) + 1
    return acc
  },
  {}
)

const { Column, HeaderCell, Cell } = Table

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function GrantReasonsPage() {
  const navigate = useNavigate()
  const [reasons, setReasons] = useState<GrantReason[]>(initialReasons)

  // Add / Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GrantReason | null>(null)
  const [labelInput, setLabelInput] = useState('')
  const [labelError, setLabelError] = useState('')

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<GrantReason | null>(null)

  function openAddModal() {
    setEditTarget(null)
    setLabelInput('')
    setLabelError('')
    setModalOpen(true)
  }

  function openEditModal(reason: GrantReason) {
    setEditTarget(reason)
    setLabelInput(reason.label)
    setLabelError('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setLabelInput('')
    setLabelError('')
    setEditTarget(null)
  }

  function handleSave() {
    const trimmed = labelInput.trim()
    if (!trimmed) {
      setLabelError('Reason label is required.')
      return
    }

    if (editTarget) {
      // Edit — update label only, ID does not change
      setReasons((prev) =>
        prev.map((r) => (r.id === editTarget.id ? { ...r, label: trimmed } : r))
      )
    } else {
      // Add — generate ID from label, reject if ID already exists
      const newId = slugify(trimmed)
      if (reasons.some((r) => r.id === newId)) {
        setLabelError(`Reason ID "${newId}" already exists. Use a different label.`)
        return
      }
      const newReason: GrantReason = {
        id: newId,
        label: trimmed,
        createdAt: new Date().toISOString(),
      }
      setReasons((prev) => [...prev, newReason])
    }

    closeModal()
  }

  function handleDelete() {
    if (!deleteTarget) return
    // NOTE: in production, deleting a reason referenced by existing grants should be
    // blocked or soft-deleted. Not enforced in the prototype.
    setReasons((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Grant Reasons</h1>
        <Button appearance="primary" onClick={openAddModal} style={{ background: '#0ecdc2', color: '#000' }}>
          Add Reason
        </Button>
      </Stack>

      {/* Table */}
      <Table
        data={reasons}
        autoHeight
        bordered
        cellBordered
        rowHeight={48}
        headerHeight={44}
      >
        <Column flexGrow={1}>
          <HeaderCell>Reason ID</HeaderCell>
          <Cell>
            {(rowData: GrantReason) => (
              <span
                onClick={() => navigate(`/coins/grant-reasons/${rowData.id}`)}
                style={{ color: '#0ecdc2', cursor: 'pointer' }}
              >
                {rowData.id}
              </span>
            )}
          </Cell>
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Label</HeaderCell>
          <Cell dataKey="label" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Created At</HeaderCell>
          <Cell>
            {(rowData: GrantReason) => formatDate(rowData.createdAt)}
          </Cell>
        </Column>

        <Column width={100} align="right">
          <HeaderCell>Grants</HeaderCell>
          <Cell>
            {(rowData: GrantReason) => (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {grantCountByReason[rowData.id] ?? 0}
              </span>
            )}
          </Cell>
        </Column>

        <Column width={160} align="center">
          <HeaderCell>Actions</HeaderCell>
          <Cell>
            {(rowData: GrantReason) => {
              const grantCount = grantCountByReason[rowData.id] ?? 0
              return (
                <Stack spacing={8} justifyContent="flex-end">
                  <Button
                    appearance="ghost"
                    size="xs"
                    onClick={() => openEditModal(rowData)}
                  >
                    Edit
                  </Button>
                  {grantCount === 0 && (
                    <Button
                      appearance="subtle"
                      size="xs"
                      style={{ color: '#f44336' }}
                      onClick={() => setDeleteTarget(rowData)}
                    >
                      Delete
                    </Button>
                  )}
                </Stack>
              )
            }}
          </Cell>
        </Column>
      </Table>

      <p style={{ marginTop: 12, fontSize: 13, color: '#aaa' }}>
        {reasons.length} reason{reasons.length !== 1 ? 's' : ''}
      </p>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} size="xs">
        <Modal.Header>
          <Modal.Title>{editTarget ? 'Edit Reason' : 'Add Reason'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form fluid>
            <Form.Group>
              <Form.ControlLabel>Reason Label</Form.ControlLabel>
              <Input
                value={labelInput}
                onChange={(val) => {
                  setLabelInput(val)
                  if (labelError) setLabelError('')
                }}
                placeholder="e.g. Marketing Activation"
                autoFocus
              />
              {labelError && (
                <Form.HelpText style={{ color: '#f44336' }}>{labelError}</Form.HelpText>
              )}
              {!editTarget && labelInput.trim() && (
                <Form.HelpText style={{ color: '#888' }}>
                  ID: {slugify(labelInput.trim())}
                </Form.HelpText>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="primary"
            onClick={handleSave}
            style={{ background: '#0ecdc2', color: '#000' }}
          >
            {editTarget ? 'Save Changes' : 'Add Reason'}
          </Button>
          <Button appearance="subtle" onClick={closeModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="xs">
        <Modal.Header>
          <Modal.Title>Delete Reason</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{deleteTarget?.label}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" onClick={handleDelete} style={{ background: '#f44336', color: '#fff' }}>
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
