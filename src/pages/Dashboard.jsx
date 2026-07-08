import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLinks, deleteLink, getLinkById } from '../hooks/useLinks'
import { generateClientXML, downloadXML } from '../utils/xmlExport'
import DeleteLinkModal from '../components/DeleteLinkModal'
import RecreateLinkModal from '../components/RecreateLinkModal'
import './Dashboard.css'

function XmlIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <polyline points="9 15 7 13 9 11"/>
      <polyline points="15 11 17 13 15 15"/>
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  )
}

function EmailStatusCell({ sentAt }) {
  const tooltip = sentAt ? `Enviado a ${formatDateTime(sentAt)}` : 'Email não enviado'
  return (
    <span className={`email-status-icon${sentAt ? ' email-status-icon--sent' : ''}`} data-tooltip={tooltip}>
      <MailIcon />
    </span>
  )
}

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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PrinterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

const LANG_BADGE_STYLE = {
  pt: { backgroundColor: '#1a5276', color: '#ffffff' },
  en: { backgroundColor: '#1e8449', color: '#ffffff' },
  es: { backgroundColor: '#922b21', color: '#ffffff' },
}

function LangBadge({ lang }) {
  const key = (lang ?? 'pt').toLowerCase()
  const style = LANG_BADGE_STYLE[key] ?? LANG_BADGE_STYLE.pt
  return (
    <span style={{ ...style, fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', flexShrink: 0 }}>
      {key.toUpperCase()}
    </span>
  )
}

const STATUS_MAP = {
  pending:   { label: 'Pendente',  cls: 'badge-pending' },
  opened:    { label: 'Aberto',    cls: 'badge-opened' },
  completed: { label: 'Concluído', cls: 'badge-completed' },
  expired:   { label: 'Expirado',  cls: 'badge-expired' },
}

const STATUS_ORDER = { pending: 0, opened: 1, completed: 2, expired: 3 }

const SORT_OPTIONS = [
  { value: 'created_at',      label: 'Data de Criação' },
  { value: 'commercial_name', label: 'Designação Comercial' },
  { value: 'vendor_name',     label: 'Vendedor' },
  { value: 'expires_at',      label: 'Prazo' },
  { value: 'opened_at',       label: 'Aberto em' },
  { value: 'email_sent_at',   label: 'Email' },
  { value: 'status',          label: 'Estado' },
]

function SortTh({ column, current, direction, onSort, children, className }) {
  const active = column === current
  return (
    <th
      className={`th-sortable${active ? ' th-sortable--active' : ''}${className ? ' ' + className : ''}`}
      onClick={() => onSort(column)}
    >
      {children}
      <span className={`sort-arrow${active ? ' sort-arrow--visible' : ''}`}>
        {direction === 'asc' ? '↑' : '↓'}
      </span>
    </th>
  )
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, highlight, blue, green, red }) {
  const mod = highlight ? ' stat-card--highlight'
    : blue  ? ' stat-card--highlight-blue'
    : green ? ' stat-card--highlight-green'
    : red   ? ' stat-card--highlight-red'
    : ''
  return (
    <div className={`stat-card${mod}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { links, loading, removeLink } = useLinks()
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState(() => {
    try {
      const stored = localStorage.getItem('upflow-active-vendor')
      return stored ? (JSON.parse(stored)?.name ?? 'all') : 'all'
    } catch { return 'all' }
  })
  const [deletingLink, setDeletingLink] = useState(null)
  const [recreatePromptLink, setRecreatePromptLink] = useState(null)
  const [xmlLoading, setXmlLoading] = useState(false)
  const [hideCompleted, setHideCompleted] = useState(
    () => localStorage.getItem('upflow-hide-completed') === 'true'
  )
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')

  function toggleHideCompleted() {
    setHideCompleted(prev => {
      const next = !prev
      localStorage.setItem('upflow-hide-completed', String(next))
      return next
    })
  }

  function handleSort(column) {
    if (column === sortColumn) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  async function handleDeleteConfirm(id) {
    await deleteLink(id)
    removeLink(id)
    if (deletingLink?.status === 'expired') setRecreatePromptLink(deletingLink)
    setDeletingLink(null)
  }

  function handleRecreateConfirm() {
    const { commercial_name, vendor_id, vendor_name, language } = recreatePromptLink
    setRecreatePromptLink(null)
    navigate('/links/create', { state: { prefill: { commercial_name, vendor_id, vendor_name, language } } })
  }

  async function handleExportXML() {
    setXmlLoading(true)
    try {
      const completedLinks = filtered.filter(l => l.status === 'completed')
      const fullLinks = await Promise.all(completedLinks.map(l => getLinkById(l.id)))
      const xml = generateClientXML(fullLinks)
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      downloadXML(xml, `upflow-export-${dd}-${mm}-${now.getFullYear()}.xml`)
    } catch (err) {
      console.error('Erro ao exportar XML:', err)
      alert('Erro ao exportar XML. Tenta novamente.')
    } finally {
      setXmlLoading(false)
    }
  }

  const vendors = useMemo(() => {
    const seen = new Set()
    return links
      .filter(l => l.vendor_name && !seen.has(l.vendor_name) && seen.add(l.vendor_name))
      .map(l => l.vendor_name)
      .sort()
  }, [links])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return links.filter(l => {
      const statusOk = statusFilter === 'all' || l.status === statusFilter
      const vendorOk = vendorFilter === 'all' || l.vendor_name === vendorFilter
      const notHidden = !(hideCompleted && l.status === 'completed')
      const searchOk = !q || (l.commercial_name ?? '').toLowerCase().includes(q)
      return statusOk && vendorOk && notHidden && searchOk
    })
  }, [links, statusFilter, vendorFilter, hideCompleted, searchQuery])

  const sorted = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case 'commercial_name':
          return dir * (a.commercial_name ?? '').localeCompare(b.commercial_name ?? '', 'pt')
        case 'vendor_name':
          return dir * (a.vendor_name ?? '').localeCompare(b.vendor_name ?? '', 'pt')
        case 'created_at':
        case 'expires_at': {
          const av = a[sortColumn] ? new Date(a[sortColumn]).getTime() : null
          const bv = b[sortColumn] ? new Date(b[sortColumn]).getTime() : null
          if (av === null && bv === null) return 0
          if (av === null) return 1
          if (bv === null) return -1
          return dir * (av - bv)
        }
        case 'opened_at': {
          const av = a.opened_at ? new Date(a.opened_at).getTime() : null
          const bv = b.opened_at ? new Date(b.opened_at).getTime() : null
          if (av === null && bv === null) return 0
          if (av === null) return 1
          if (bv === null) return -1
          return dir * (av - bv)
        }
        case 'email_sent_at': {
          const av = a.email_sent_at ? new Date(a.email_sent_at).getTime() : null
          const bv = b.email_sent_at ? new Date(b.email_sent_at).getTime() : null
          if (av === null && bv === null) return 0
          if (av === null) return 1
          if (bv === null) return -1
          return dir * (av - bv)
        }
        case 'status': {
          const ao = STATUS_ORDER[a.status] ?? 99
          const bo = STATUS_ORDER[b.status] ?? 99
          return dir * (ao - bo)
        }
        default:
          return 0
      }
    })
  }, [filtered, sortColumn, sortDirection])

  const hasCompleted = filtered.some(l => l.status === 'completed')

  const stats = {
    total:     links.length,
    pending:   links.filter(l => l.status === 'pending').length,
    opened:    links.filter(l => l.status === 'opened').length,
    completed: links.filter(l => l.status === 'completed').length,
    expired:   links.filter(l => l.status === 'expired').length,
  }

  return (
    <div className="dashboard">
      <div className="print-header">
        <h1>UpFlow — Lista de Links</h1>
        <p>Impresso em {formatDateTime(new Date().toISOString())}</p>
      </div>

      <header className="dashboard-header">
        <h1 className="dashboard-title">UpFlow</h1>
        <p className="dashboard-subtitle">Portal de atualização de dados de clientes</p>
      </header>

      <div className="stats-grid">
        <StatCard label="Total de links"  value={loading ? '—' : stats.total} />
        <StatCard label="Pendentes"       value={loading ? '—' : stats.pending}   highlight />
        <StatCard label="Abertos"         value={loading ? '—' : stats.opened}    blue />
        <StatCard label="Concluídos"      value={loading ? '—' : stats.completed} green />
        <StatCard label="Expirados"       value={loading ? '—' : stats.expired}  red />
      </div>

      <div className="dashboard-filters">
        <div className="search-box">
          <SearchIcon />
          <input
            type="text"
            className="search-input"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar pesquisa"
            >
              <XIcon />
            </button>
          )}
        </div>

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

        <button
          className="btn-xml-export"
          onClick={handleExportXML}
          disabled={!hasCompleted || xmlLoading}
          data-tooltip={!hasCompleted ? 'Sem registos concluídos' : undefined}
        >
          <XmlIcon />
          {xmlLoading ? 'A exportar…' : 'Exportar XML'}
        </button>

        <button
          className="btn-icon"
          type="button"
          onClick={() => window.print()}
          aria-label="Imprimir lista"
        >
          <PrinterIcon />
        </button>
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
                  <SortTh column="commercial_name" current={sortColumn} direction={sortDirection} onSort={handleSort}>Designação Comercial</SortTh>
                  <SortTh column="vendor_name"     current={sortColumn} direction={sortDirection} onSort={handleSort}>Vendedor</SortTh>
                  <SortTh column="created_at"      current={sortColumn} direction={sortDirection} onSort={handleSort}>Criado em</SortTh>
                  <SortTh column="expires_at"      current={sortColumn} direction={sortDirection} onSort={handleSort}>Prazo</SortTh>
                  <SortTh column="opened_at"       current={sortColumn} direction={sortDirection} onSort={handleSort} className="print-hide-col">Aberto em</SortTh>
                  <SortTh column="email_sent_at"   current={sortColumn} direction={sortDirection} onSort={handleSort} className="print-hide-col">Email</SortTh>
                  <SortTh column="status"          current={sortColumn} direction={sortDirection} onSort={handleSort}>Estado</SortTh>
                  <th className="print-hide-col"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(link => {
                  const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
                  return (
                    <tr key={link.id}>
                      <td><span className="td-name-wrap">{link.commercial_name}<LangBadge lang={link.language} /></span></td>
                      <td className="td-vendor">{link.vendor_name ?? '—'}</td>
                      <td>{formatDate(link.created_at)}</td>
                      <td>{formatDate(link.expires_at)}</td>
                      <td className="td-muted print-hide-col">{formatDateTime(link.opened_at)}</td>
                      <td className="td-email print-hide-col"><EmailStatusCell sentAt={link.email_sent_at} /></td>
                      <td><span className={`status-badge ${s.cls}`}>{s.label}</span></td>
                      <td className="print-hide-col">
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

          <div className="mobile-sort-controls">
            <span className="mobile-sort-label">Ordenar por</span>
            <select
              className="filter-select"
              value={sortColumn}
              onChange={e => { setSortColumn(e.target.value); setSortDirection('asc') }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              className="mobile-sort-dir"
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              aria-label="Alternar direção de ordenação"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="links-cards">
            {sorted.map(link => {
              const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
              return (
                <div key={link.id} className="link-card">
                  <div className="link-card-top">
                    <div>
                      <p className="link-card-name">{link.commercial_name}<LangBadge lang={link.language} /></p>
                      {link.vendor_name && (
                        <p className="link-card-company">Vendedor: {link.vendor_name}</p>
                      )}
                    </div>
                    <div className="link-card-badges">
                      <EmailStatusCell sentAt={link.email_sent_at} />
                      <span className={`status-badge ${s.cls}`}>{s.label}</span>
                    </div>
                  </div>
                  <div className="link-card-bottom">
                    <div>
                      <span className="link-card-date">Prazo: {formatDate(link.expires_at)}</span>
                      <span className="link-card-date">Aberto: {formatDateTime(link.opened_at)}</span>
                    </div>
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

      {recreatePromptLink && (
        <RecreateLinkModal
          link={recreatePromptLink}
          onConfirm={handleRecreateConfirm}
          onClose={() => setRecreatePromptLink(null)}
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
