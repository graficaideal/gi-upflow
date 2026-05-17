import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'
import '../components/DeleteLinkModal.css'
import './Settings.css'

// ── Backup helpers ────────────────────────────────────────────────────────────

async function fetchAllTables() {
  const [
    { data: vendors,        error: e1 },
    { data: links,          error: e2 },
    { data: submissions,    error: e3 },
    { data: contacts,       error: e4 },
    { data: authorizations, error: e5 },
    { data: rgpd_consent,   error: e6 },
  ] = await Promise.all([
    supabase.from('upflow_vendors').select('*'),
    supabase.from('upflow_links').select('*'),
    supabase.from('upflow_submissions').select('*'),
    supabase.from('upflow_contacts').select('*'),
    supabase.from('upflow_authorizations').select('*'),
    supabase.from('upflow_rgpd_consent').select('*'),
  ])

  const err = e1 || e2 || e3 || e4 || e5 || e6
  if (err) throw err

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    app: 'UpFlow',
    data: {
      vendors:        vendors        ?? [],
      links:          links          ?? [],
      submissions:    submissions    ?? [],
      contacts:       contacts       ?? [],
      authorizations: authorizations ?? [],
      rgpd_consent:   rgpd_consent   ?? [],
    },
  }
}

function downloadBackupJSON(obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `upflow-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Restore helpers ───────────────────────────────────────────────────────────

function validateBackupFile(obj) {
  if (!obj || typeof obj !== 'object') return 'Ficheiro inválido — não é um objecto JSON'
  if (!obj.version) return 'Estrutura inválida — campo "version" em falta'
  if (!obj.data || typeof obj.data !== 'object') return 'Estrutura inválida — campo "data" em falta'
  const required = ['vendors', 'links', 'submissions', 'contacts', 'authorizations', 'rgpd_consent']
  for (const key of required) {
    if (!Array.isArray(obj.data[key])) return `Estrutura inválida — data.${key} não é um array`
  }
  return null
}

const DELETE_ORDER = [
  'upflow_rgpd_consent',
  'upflow_authorizations',
  'upflow_contacts',
  'upflow_submissions',
  'upflow_links',
  'upflow_vendors',
]

const INSERT_ORDER = [
  ['upflow_vendors',        'vendors'],
  ['upflow_links',          'links'],
  ['upflow_submissions',    'submissions'],
  ['upflow_contacts',       'contacts'],
  ['upflow_authorizations', 'authorizations'],
  ['upflow_rgpd_consent',   'rgpd_consent'],
]

async function executeRestore(data, onProgress) {
  for (const table of DELETE_ORDER) {
    onProgress(`A apagar ${table}…`)
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) throw new Error(`Erro ao apagar ${table}: ${error.message}`)
  }
  for (const [table, key] of INSERT_ORDER) {
    const rows = data[key]
    if (!rows.length) continue
    onProgress(`A restaurar ${table} (${rows.length} registos)…`)
    const { error } = await supabase.from(table).insert(rows)
    if (error) throw new Error(`Erro ao inserir em ${table}: ${error.message}`)
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function DownloadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 17 12 21 16 17" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function RotateCCWIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  )
}

// ── Vendor icons ─────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

const AVATAR_PALETTE = ['#4a6fa5', '#2e7d5e', '#7b5ea7', '#b5451b', '#2c7873', '#5c6bc0']

function avatarColor(name) {
  let h = 0
  for (const c of (name || '?')) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[Math.abs(h)]
}

// ── Restore modal ─────────────────────────────────────────────────────────────

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function RestoreModal({ onConfirm, onClose, loading, progress }) {
  const [code] = useState(generateCode)
  const [input, setInput] = useState('')

  return (
    <div className="modal-backdrop" onClick={!loading ? onClose : undefined}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Confirmar Restauro</h2>
        <p className="modal-warning">
          ⚠️ Esta operação vai substituir TODOS os dados existentes. Esta ação é irreversível.
        </p>
        {loading ? (
          <p className="restore-modal-progress">{progress || 'A processar…'}</p>
        ) : (
          <>
            <p className="modal-code-label">Para confirmar, introduz o código:</p>
            <p className="modal-code">{code}</p>
            <input
              className="modal-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={input}
              autoFocus
              placeholder="····"
              onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-danger"
            type="button"
            disabled={loading || input !== code}
            onClick={onConfirm}
          >
            {loading ? 'A restaurar…' : 'Restaurar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Settings() {
  // Backup
  const [backupLoading, setBackupLoading]   = useState(false)
  const [backupDone, setBackupDone]         = useState(false)
  const [backupError, setBackupError]       = useState('')

  // Restore
  const [restoreData, setRestoreData]             = useState(null)
  const [restoreError, setRestoreError]           = useState('')
  const [showRestoreModal, setShowRestoreModal]   = useState(false)
  const [restoreLoading, setRestoreLoading]       = useState(false)
  const [restoreProgress, setRestoreProgress]     = useState('')
  const [restoreDone, setRestoreDone]             = useState(false)
  const fileInputRef = useRef(null)

  // Vendors
  const [vendors, setVendors]           = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorError, setVendorError]   = useState('')
  const [addingNew, setAddingNew]       = useState(false)
  const [newVendor, setNewVendor]       = useState({ name: '', email: '' })
  const [editingId, setEditingId]       = useState(null)
  const [editForm, setEditForm]         = useState({ name: '', email: '' })
  const [vendorSaving, setVendorSaving] = useState(false)
  const [deletingVendorId, setDeletingVendorId] = useState(null)
  const [deleteHasLinks, setDeleteHasLinks]     = useState(false)
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false)

  useEffect(() => { loadVendors() }, [])

  async function loadVendors() {
    setVendorsLoading(true)
    const { data, error } = await supabase
      .from('upflow_vendors')
      .select('id, name, email, active')
      .order('name')
    setVendorsLoading(false)
    if (error) { setVendorError(error.message); return }
    setVendors(data ?? [])
  }

  // ── Backup ──────────────────────────────────────────────────────────────────

  async function handleBackup() {
    setBackupLoading(true)
    setBackupDone(false)
    setBackupError('')
    try {
      const data = await fetchAllTables()
      downloadBackupJSON(data)
      setBackupDone(true)
    } catch (e) {
      setBackupError(e.message)
    } finally {
      setBackupLoading(false)
    }
  }

  // ── Restore ─────────────────────────────────────────────────────────────────

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoreError('')
    setRestoreData(null)
    setRestoreDone(false)
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const obj = JSON.parse(evt.target.result)
        const err = validateBackupFile(obj)
        if (err) { setRestoreError(err); return }
        setRestoreData(obj)
      } catch {
        setRestoreError('Não foi possível ler o ficheiro JSON.')
      }
    }
    reader.readAsText(file)
  }

  async function handleRestoreConfirm() {
    setRestoreLoading(true)
    setRestoreProgress('')
    try {
      await executeRestore(restoreData.data, setRestoreProgress)
      setRestoreDone(true)
      setShowRestoreModal(false)
      setRestoreData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setRestoreError(e.message)
      setShowRestoreModal(false)
    } finally {
      setRestoreLoading(false)
      setRestoreProgress('')
    }
  }

  // ── Vendors ─────────────────────────────────────────────────────────────────

  async function handleAddVendor() {
    if (!newVendor.name.trim()) return
    setVendorSaving(true)
    setVendorError('')
    const { error } = await supabase
      .from('upflow_vendors')
      .insert({ name: newVendor.name.trim(), email: newVendor.email.trim() || null, active: true })
    setVendorSaving(false)
    if (error) { setVendorError(error.message); return }
    setAddingNew(false)
    setNewVendor({ name: '', email: '' })
    loadVendors()
  }

  function startEdit(v) {
    setEditingId(v.id)
    setEditForm({ name: v.name, email: v.email ?? '' })
  }

  async function handleSaveEdit(id) {
    if (!editForm.name.trim()) return
    setVendorSaving(true)
    setVendorError('')
    const { error } = await supabase
      .from('upflow_vendors')
      .update({ name: editForm.name.trim(), email: editForm.email.trim() || null })
      .eq('id', id)
    setVendorSaving(false)
    if (error) { setVendorError(error.message); return }
    setEditingId(null)
    loadVendors()
  }

  async function handleDeleteClick(vendor) {
    setDeletingVendorId(vendor.id)
    setDeleteCheckLoading(true)
    const { count, error } = await supabase
      .from('upflow_links')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)
    setDeleteCheckLoading(false)
    if (error) { setVendorError(error.message); setDeletingVendorId(null); return }
    setDeleteHasLinks(count > 0)
  }

  async function handleDeleteConfirm(id) {
    setVendorError('')
    const { error } = await supabase.from('upflow_vendors').delete().eq('id', id)
    if (error) { setVendorError(error.message); return }
    setDeletingVendorId(null)
    setVendors(prev => prev.filter(v => v.id !== id))
  }

  function handleDeleteCancel() {
    setDeletingVendorId(null)
    setDeleteHasLinks(false)
  }

  async function handleToggleActive(vendor) {
    const { error } = await supabase
      .from('upflow_vendors')
      .update({ active: !vendor.active })
      .eq('id', vendor.id)
    if (error) { setVendorError(error.message); return }
    setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, active: !v.active } : v))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="settings">
      <header className="settings-header">
        <h1 className="settings-title">Definições</h1>
      </header>

      {/* Card 1 — Backup */}
      <div className="settings-card">
        <div className="action-row">
          <div className="action-row-icon action-row-icon--yellow">
            <DatabaseIcon />
          </div>
          <div className="action-row-info">
            <span className="action-row-title">Backup de Dados</span>
            <span className="action-row-desc">Exporta todos os dados para JSON. Guarda num local seguro.</span>
          </div>
          <button className="action-btn" onClick={handleBackup} disabled={backupLoading}>
            <DownloadCloudIcon />
            {backupLoading ? 'A exportar…' : 'Fazer Backup'}
          </button>
        </div>
        {backupError && <p className="settings-feedback settings-feedback--error">{backupError}</p>}
        {backupDone  && <p className="settings-feedback settings-feedback--success">✓ Backup efetuado com sucesso.</p>}
      </div>

      {/* Card 2 — Restore */}
      <div className="settings-card">
        <div className="action-row">
          <div className="action-row-icon action-row-icon--red">
            <RotateCCWIcon />
          </div>
          <div className="action-row-info">
            <span className="action-row-title">Restaurar Backup</span>
            <span className="action-row-desc action-row-desc--warn">
              Substituirá todos os dados existentes. Esta ação é irreversível.
            </span>
          </div>
          <label className="action-btn action-btn--secondary" htmlFor="restore-file-input">
            <UploadIcon />
            Selecionar ficheiro
          </label>
          <input
            id="restore-file-input"
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {restoreError && <p className="settings-feedback settings-feedback--error">{restoreError}</p>}

        {restoreData && (
          <div className="restore-summary">
            <div className="restore-summary-header">
              <span>Exportado em {new Date(restoreData.exported_at).toLocaleString('pt-PT')}</span>
            </div>
            <div className="restore-summary-rows">
              {Object.entries(restoreData.data).map(([key, rows]) => (
                <div key={key} className="restore-summary-row">
                  <span className="restore-summary-key">{key.replace('upflow_', '')}</span>
                  <span className="restore-summary-count">{rows.length}</span>
                </div>
              ))}
            </div>
            <div className="restore-summary-footer">
              {restoreDone
                ? <span className="settings-feedback settings-feedback--success" style={{ border: 'none', padding: 0, background: 'none' }}>✓ Restauro concluído com sucesso.</span>
                : <button className="action-btn action-btn--danger" disabled={restoreLoading} onClick={() => setShowRestoreModal(true)}>
                    <RotateCCWIcon />
                    Restaurar
                  </button>
              }
            </div>
          </div>
        )}
      </div>

      {/* Card 3 — Vendors */}
      <div className="settings-card">
        <div className="settings-card-header-row">
          <h2 className="settings-card-title" style={{ marginBottom: 0 }}>Vendedores</h2>
          {!addingNew && (
            <button className="btn-add-vendor" onClick={() => setAddingNew(true)}>
              + Adicionar Vendedor
            </button>
          )}
        </div>
        {vendorError && <p className="settings-error">{vendorError}</p>}

        {addingNew && (
          <div className="vendor-inline-form">
            <input
              className="vendor-input"
              placeholder="Nome *"
              value={newVendor.name}
              onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))}
            />
            <input
              className="vendor-input"
              placeholder="Email"
              type="email"
              value={newVendor.email}
              onChange={e => setNewVendor(v => ({ ...v, email: e.target.value }))}
            />
            <div className="vendor-form-actions">
              <button className="btn-vendor-save" onClick={handleAddVendor} disabled={vendorSaving || !newVendor.name.trim()}>
                {vendorSaving ? 'A guardar…' : 'Guardar'}
              </button>
              <button className="btn-vendor-cancel" onClick={() => { setAddingNew(false); setNewVendor({ name: '', email: '' }) }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {vendorsLoading ? (
          <p className="settings-loading">A carregar…</p>
        ) : (
          <div className="vendors-list">
            {vendors.length === 0 && (
              <p className="settings-empty">Nenhum vendedor encontrado.</p>
            )}
            {vendors.map(v => (
              <div key={v.id} className={`vendor-row${!v.active ? ' vendor-row--inactive' : ''}${deletingVendorId === v.id ? ' vendor-row--confirming' : ''}`}>

                {editingId === v.id ? (
                  /* ── Edit form ── */
                  <div className="vendor-edit-form">
                    <input
                      className="vendor-input"
                      placeholder="Nome *"
                      value={editForm.name}
                      autoFocus
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      className="vendor-input"
                      placeholder="Email"
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <div className="vendor-edit-actions">
                      <button className="vendor-edit-save" onClick={() => handleSaveEdit(v.id)} disabled={vendorSaving || !editForm.name.trim()}>
                        {vendorSaving ? 'A guardar…' : 'Guardar'}
                      </button>
                      <button className="vendor-edit-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <>
                    <div className="vendor-avatar" style={{ background: avatarColor(v.name) }}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="vendor-info">
                      <span className="vendor-name">{v.name}</span>
                      {v.email && <span className="vendor-email">{v.email}</span>}
                    </div>

                    {deletingVendorId === v.id ? (
                      /* ── Delete confirm bar ── */
                      <div className="vendor-confirm-bar">
                        {deleteCheckLoading ? (
                          <span className="vendor-confirm-label">A verificar…</span>
                        ) : deleteHasLinks ? (
                          <>
                            <span className="vendor-confirm-label vendor-confirm-label--warn">
                              ⚠ Tem links — sugerimos inativar
                            </span>
                            <button className="vendor-confirm-btn vendor-confirm-btn--warn"
                              onClick={() => { handleToggleActive(v); handleDeleteCancel() }}>
                              {v.active ? 'Inativar' : 'Já inativo'}
                            </button>
                            <button className="vendor-confirm-dismiss" onClick={handleDeleteCancel}>✕</button>
                          </>
                        ) : (
                          <>
                            <span className="vendor-confirm-label vendor-confirm-label--danger">
                              Eliminar <strong>{v.name}</strong>?
                            </span>
                            <button className="vendor-confirm-btn vendor-confirm-btn--danger"
                              onClick={() => handleDeleteConfirm(v.id)}>
                              Eliminar
                            </button>
                            <button className="vendor-confirm-dismiss" onClick={handleDeleteCancel}>✕</button>
                          </>
                        )}
                      </div>
                    ) : (
                      /* ── Action buttons ── */
                      <div className="vendor-actions">
                        <span className={`vendor-dot${v.active ? ' vendor-dot--active' : ''}`}
                          data-tooltip={v.active ? 'Ativo' : 'Inativo'} />
                        <button className="vendor-btn" data-tooltip="Editar"
                          onClick={() => startEdit(v)}>
                          <PencilIcon />
                        </button>
                        <button
                          className={`vendor-btn${v.active ? ' vendor-btn--warn' : ' vendor-btn--success'}`}
                          data-tooltip={v.active ? 'Desativar' : 'Ativar'}
                          onClick={() => handleToggleActive(v)}>
                          {v.active ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                        <button className="vendor-btn vendor-btn--danger" data-tooltip="Eliminar"
                          onClick={() => handleDeleteClick(v)}>
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRestoreModal && (
        <RestoreModal
          onConfirm={handleRestoreConfirm}
          onClose={() => !restoreLoading && setShowRestoreModal(false)}
          loading={restoreLoading}
          progress={restoreProgress}
        />
      )}
    </div>
  )
}
