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
        <h2 className="settings-card-title">Backup de Dados</h2>
        <p className="settings-card-desc">
          Exporta todos os dados da aplicação para um ficheiro JSON. Guarda este ficheiro num local seguro.
        </p>
        {backupError && <p className="settings-error">{backupError}</p>}
        {backupDone  && <p className="settings-success">✓ Backup efetuado com sucesso.</p>}
        <button className="btn-backup" onClick={handleBackup} disabled={backupLoading}>
          {backupLoading ? 'A exportar…' : 'Fazer Backup'}
        </button>
      </div>

      {/* Card 2 — Restore */}
      <div className="settings-card">
        <h2 className="settings-card-title">Restaurar Backup</h2>
        <p className="settings-restore-warning">
          ⚠️ Esta operação vai substituir todos os dados existentes. Esta ação é irreversível.
        </p>
        <label className="settings-file-label">Selecionar ficheiro de backup:</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="settings-file-input"
          onChange={handleFileChange}
        />
        {restoreError && <p className="settings-error">{restoreError}</p>}
        {restoreData && (
          <div className="restore-summary">
            <p className="restore-summary-title">Resumo do ficheiro</p>
            <div className="restore-summary-item">
              <span>Data de exportação</span>
              <span>{new Date(restoreData.exported_at).toLocaleString('pt-PT')}</span>
            </div>
            {Object.entries(restoreData.data).map(([key, rows]) => (
              <div key={key} className="restore-summary-item">
                <span>{key}</span>
                <span>{rows.length} registos</span>
              </div>
            ))}
          </div>
        )}
        {restoreDone && <p className="settings-success">✓ Restauro concluído com sucesso.</p>}
        <button
          className="btn-restore"
          disabled={!restoreData || restoreLoading}
          onClick={() => setShowRestoreModal(true)}
        >
          Restaurar
        </button>
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
              <div key={v.id} className={`vendor-row${v.active ? '' : ' vendor-row--inactive'}`}>
                {editingId === v.id ? (
                  <div className="vendor-inline-form vendor-inline-form--edit">
                    <input
                      className="vendor-input"
                      placeholder="Nome *"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      className="vendor-input"
                      placeholder="Email"
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    />
                    <div className="vendor-form-actions">
                      <button className="btn-vendor-save" onClick={() => handleSaveEdit(v.id)} disabled={vendorSaving || !editForm.name.trim()}>
                        {vendorSaving ? 'A guardar…' : 'Guardar'}
                      </button>
                      <button className="btn-vendor-cancel" onClick={() => setEditingId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="vendor-info">
                      <span className="vendor-name">{v.name}</span>
                      {v.email && <span className="vendor-email">{v.email}</span>}
                    </div>
                    <div className="vendor-actions">
                      <span className={`vendor-status${v.active ? ' vendor-status--active' : ' vendor-status--inactive'}`}>
                        {v.active ? 'Ativo' : 'Inativo'}
                      </span>
                      <button className="btn-vendor-edit" onClick={() => startEdit(v)}>Editar</button>
                      <button
                        className={`btn-vendor-toggle${v.active ? ' btn-vendor-toggle--deactivate' : ' btn-vendor-toggle--activate'}`}
                        onClick={() => handleToggleActive(v)}
                      >
                        {v.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
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
