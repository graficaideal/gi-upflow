import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLinks, deleteLink } from '../hooks/useLinks'
import DeleteLinkModal from '../components/DeleteLinkModal'
import './Dashboard.css'

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

const STATUS_MAP = {
  pending:   { label: 'Pendente',  cls: 'badge-pending' },
  opened:    { label: 'Aberto',    cls: 'badge-opened' },
  completed: { label: 'Concluído', cls: 'badge-completed' },
  expired:   { label: 'Expirado',  cls: 'badge-expired' },
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`stat-card${highlight ? ' stat-card--highlight' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const { links, loading, removeLink } = useLinks()
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState(() => {
    try {
      const stored = localStorage.getItem('upflow-active-vendor')
      return stored ? (JSON.parse(stored)?.name ?? 'all') : 'all'
    } catch { return 'all' }
  })
  const [deletingLink, setDeletingLink] = useState(null)
  const [hideCompleted, setHideCompleted] = useState(
    () => localStorage.getItem('upflow-hide-completed') === 'true'
  )

  function toggleHideCompleted() {
    setHideCompleted(prev => {
      const next = !prev
      localStorage.setItem('upflow-hide-completed', String(next))
      return next
    })
  }

  async function handleDeleteConfirm(id) {
    await deleteLink(id)
    removeLink(id)
    setDeletingLink(null)
  }

  const vendors = useMemo(() => {
    const seen = new Set()
    return links
      .filter(l => l.vendor_name && !seen.has(l.vendor_name) && seen.add(l.vendor_name))
      .map(l => l.vendor_name)
      .sort()
  }, [links])

  const filtered = useMemo(() => links.filter(l => {
    const statusOk = statusFilter === 'all' || l.status === statusFilter
    const vendorOk = vendorFilter === 'all' || l.vendor_name === vendorFilter
    const notHidden = !(hideCompleted && l.status === 'completed')
    return statusOk && vendorOk && notHidden
  }), [links, statusFilter, vendorFilter, hideCompleted])

  const stats = {
    total:     links.length,
    pending:   links.filter(l => l.status === 'pending').length,
    completed: links.filter(l => l.status === 'completed').length,
    expired:   links.filter(l => l.status === 'expired').length,
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">UpFlow</h1>
        <p className="dashboard-subtitle">Portal de atualização de dados de clientes</p>
      </header>

      <div className="stats-grid">
        <StatCard label="Total de links"  value={loading ? '—' : stats.total} />
        <StatCard label="Pendentes"       value={loading ? '—' : stats.pending}   highlight />
        <StatCard label="Concluídos"      value={loading ? '—' : stats.completed} />
        <StatCard label="Expirados"       value={loading ? '—' : stats.expired} />
      </div>

      <div className="dashboard-filters">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="opened">Aberto</option>
          <option value="completed">Concluído</option>
          <option value="expired">Expirado</option>
        </select>

        <select
          className="filter-select"
          value={vendorFilter}
          onChange={e => {
            const name = e.target.value
            setVendorFilter(name)
            if (name === 'all') {
              localStorage.removeItem('upflow-active-vendor')
            } else {
              const link = links.find(l => l.vendor_name === name)
              const entry = link ? { id: link.vendor_id, name } : { name }
              localStorage.setItem('upflow-active-vendor', JSON.stringify(entry))
            }
          }}
        >
          <option value="all">Todos os vendedores</option>
          {vendors.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={toggleHideCompleted}
          />
          Ocultar concluídos
        </label>
      </div>

      {loading && <p className="dashboard-loading">A carregar…</p>}

      {!loading && filtered.length === 0 && links.length === 0 && (
        <div className="dashboard-empty">
          <p>Ainda não criaste nenhum link de atualização.</p>
          <Link to="/links/create" className="btn-primary">Criar primeiro link</Link>
        </div>
      )}

      {!loading && filtered.length === 0 && links.length > 0 && (
        <p className="dashboard-loading">Nenhum link corresponde aos filtros seleccionados.</p>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="links-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Empresa</th>
                  <th>Vendedor</th>
                  <th>Criado em</th>
                  <th>Prazo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => {
                  const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
                  return (
                    <tr key={link.id}>
                      <td>{link.client_name}</td>
                      <td>{link.company_name}</td>
                      <td className="td-vendor">{link.vendor_name ?? '—'}</td>
                      <td>{formatDate(link.created_at)}</td>
                      <td>{formatDate(link.expires_at)}</td>
                      <td>
                        <span className={`status-badge ${s.cls}`}>{s.label}</span>
                        {link.opened_at && <p className="td-opened-at">Aberto {formatDate(link.opened_at)}</p>}
                      </td>
                      <td>
                        <div className="td-actions">
                          <Link to={`/links/${link.id}`} className="btn-detail">Ver detalhe</Link>
                          <button
                            className="btn-icon btn-icon--danger"
                            type="button"
                            onClick={() => setDeletingLink(link)}
                            aria-label="Apagar link"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="links-cards">
            {filtered.map(link => {
              const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
              return (
                <div key={link.id} className="link-card">
                  <div className="link-card-top">
                    <div>
                      <p className="link-card-name">{link.client_name}</p>
                      <p className="link-card-company">{link.company_name}</p>
                      {link.vendor_name && (
                        <p className="link-card-company">Vendedor: {link.vendor_name}</p>
                      )}
                    </div>
                    <span className={`status-badge ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="link-card-bottom">
                    <span className="link-card-date">
                      Prazo: {formatDate(link.expires_at)}
                      {link.opened_at && <span className="card-opened-at"> · Aberto {formatDate(link.opened_at)}</span>}
                    </span>
                    <div className="td-actions">
                      <button
                        className="btn-icon btn-icon--danger"
                        type="button"
                        onClick={() => setDeletingLink(link)}
                        aria-label="Apagar link"
                      >
                        <TrashIcon />
                      </button>
                      <Link to={`/links/${link.id}`} className="btn-detail">Ver detalhe</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {deletingLink && (
        <DeleteLinkModal
          link={deletingLink}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingLink(null)}
        />
      )}

      <Link to="/links/create" className="fab" aria-label="Criar novo link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  )
}
