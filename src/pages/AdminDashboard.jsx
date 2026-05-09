import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllLinks, markExpired } from '../hooks/useLinks'
import './AdminDashboard.css'

const STATUS_MAP = {
  pending:   { label: 'Pendente',  cls: 'badge-pending' },
  completed: { label: 'Concluído', cls: 'badge-completed' },
  expired:   { label: 'Expirado',  cls: 'badge-expired' },
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminDashboard() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function load() {
      await markExpired().catch(() => {})
      const data = await getAllLinks().catch(() => [])
      setLinks(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => links.filter(l =>
    statusFilter === 'all' || l.status === statusFilter
  ), [links, statusFilter])

  const stats = {
    total:     links.length,
    pending:   links.filter(l => l.status === 'pending').length,
    completed: links.filter(l => l.status === 'completed').length,
    expired:   links.filter(l => l.status === 'expired').length,
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1 className="admin-title">Administração</h1>
        <p className="admin-subtitle">Visão global de todos os links e submissões</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{loading ? '—' : stats.total}</span>
          <span className="stat-label">Total de links</span>
        </div>
        <div className="stat-card stat-card--highlight">
          <span className="stat-value">{loading ? '—' : stats.pending}</span>
          <span className="stat-label">Pendentes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{loading ? '—' : stats.completed}</span>
          <span className="stat-label">Concluídos</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{loading ? '—' : stats.expired}</span>
          <span className="stat-label">Expirados</span>
        </div>
      </div>

      <div className="admin-filters">
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os estados</option>
          <option value="pending">Pendente</option>
          <option value="completed">Concluído</option>
          <option value="expired">Expirado</option>
        </select>
      </div>

      {loading && <p className="admin-state">A carregar…</p>}

      {!loading && filtered.length === 0 && (
        <p className="admin-state">Nenhum link corresponde ao filtro seleccionado.</p>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="table-wrapper">
            <table className="links-table">
              <thead>
                <tr>
                  <th>Designação Comercial</th>
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
                      <td>{link.commercial_name}</td>
                      <td>{formatDate(link.created_at)}</td>
                      <td>{formatDate(link.expires_at)}</td>
                      <td><span className={`status-badge ${s.cls}`}>{s.label}</span></td>
                      <td><Link to={`/links/${link.id}`} className="btn-detail">Ver detalhe</Link></td>
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
                      <p className="link-card-name">{link.commercial_name}</p>
                    </div>
                    <span className={`status-badge ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="link-card-bottom">
                    <span className="link-card-date">Prazo: {formatDate(link.expires_at)}</span>
                    <Link to={`/links/${link.id}`} className="btn-detail">Ver detalhe</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
