import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getAuthorizations } from '../hooks/useAuthorizations'
import './Authorizations.css'

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function AuthIcon({ value }) {
  return value
    ? <span className="auth-icon auth-icon--yes">✓</span>
    : <span className="auth-icon auth-icon--no">✗</span>
}

function AuthStatCard({ label, yes, no, loading }) {
  return (
    <div className="stat-card auth-stat-card">
      <span className="auth-stat-label">{label}</span>
      <div className="auth-stat-counts">
        <div className="auth-count auth-count--yes">
          <span className="auth-count-value">{loading ? '—' : yes}</span>
          <span className="auth-count-label">Autorizados</span>
        </div>
        <div className="auth-count auth-count--no">
          <span className="auth-count-value">{loading ? '—' : no}</span>
          <span className="auth-count-label">Não autorizados</span>
        </div>
      </div>
    </div>
  )
}

export default function Authorizations() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [toggleFotos, setToggleFotos] = useState(false)
  const [toggleVideos, setToggleVideos] = useState(false)
  const [togglePublicacoes, setTogglePublicacoes] = useState(false)

  useEffect(() => {
    let mounted = true
    getAuthorizations()
      .then(d => { if (mounted) { setData(d); setLoading(false) } })
      .catch(e => { if (mounted) { setError(e); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  const stats = useMemo(() => ({
    fotosYes:  data.filter(r => r.fotos).length,
    fotosNo:   data.filter(r => !r.fotos).length,
    videosYes: data.filter(r => r.videos).length,
    videosNo:  data.filter(r => !r.videos).length,
    pubYes:    data.filter(r => r.publicacoes).length,
    pubNo:     data.filter(r => !r.publicacoes).length,
  }), [data])

  const filtered = useMemo(() => {
    return data.filter(row => {
      if (search && !row.company_name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterMode === 'all_authorized' && !(row.fotos && row.videos && row.publicacoes)) return false
      if (filterMode === 'any_not_authorized' && row.fotos && row.videos && row.publicacoes) return false
      if (toggleFotos && !row.fotos) return false
      if (toggleVideos && !row.videos) return false
      if (togglePublicacoes && !row.publicacoes) return false
      return true
    })
  }, [data, search, filterMode, toggleFotos, toggleVideos, togglePublicacoes])

  function exportXLS() {
    const rows = filtered.map(r => ({
      'Empresa':              r.company_name,
      'Fotos':                r.fotos       ? 'Sim' : 'Não',
      'Vídeos':               r.videos      ? 'Sim' : 'Não',
      'Publicações':          r.publicacoes ? 'Sim' : 'Não',
      'Data de Submissão':    formatDate(r.submitted_at),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Autorizações')
    XLSX.writeFile(wb, 'autorizacoes-gi.xlsx')
  }

  return (
    <div className="auth-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Autorizações de Imagem</h1>
        <p className="dashboard-subtitle">Resumo das autorizações de imagem submetidas pelos clientes</p>
      </header>

      <div className="auth-stats-grid">
        <AuthStatCard label="Fotos"                    yes={stats.fotosYes}  no={stats.fotosNo}  loading={loading} />
        <AuthStatCard label="Vídeos"                   yes={stats.videosYes} no={stats.videosNo} loading={loading} />
        <AuthStatCard label="Publicações Corporativas" yes={stats.pubYes}    no={stats.pubNo}    loading={loading} />
      </div>

      <div className="auth-filters">
        <input
          className="filter-input"
          type="text"
          placeholder="Pesquisar empresa…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterMode}
          onChange={e => setFilterMode(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="all_authorized">Autorizou tudo</option>
          <option value="any_not_authorized">Não autorizou pelo menos um</option>
        </select>
        <div className="auth-toggles">
          <button
            type="button"
            className={`auth-toggle-btn${toggleFotos ? ' active' : ''}`}
            onClick={() => setToggleFotos(p => !p)}
          >Fotos</button>
          <button
            type="button"
            className={`auth-toggle-btn${toggleVideos ? ' active' : ''}`}
            onClick={() => setToggleVideos(p => !p)}
          >Vídeos</button>
          <button
            type="button"
            className={`auth-toggle-btn${togglePublicacoes ? ' active' : ''}`}
            onClick={() => setTogglePublicacoes(p => !p)}
          >Publicações</button>
        </div>
        <button type="button" className="btn-secondary auth-export-btn" onClick={exportXLS}>
          Exportar Excel
        </button>
      </div>

      {loading && <p className="dashboard-loading">A carregar…</p>}
      {error && <p className="auth-error">Erro ao carregar os dados de autorizações.</p>}

      {!loading && !error && (
        <>
          <div className="table-wrapper">
            <table className="links-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Fotos</th>
                  <th>Vídeos</th>
                  <th>Publicações</th>
                  <th>Data de Submissão</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="auth-empty-cell">Nenhum resultado encontrado.</td>
                  </tr>
                ) : filtered.map((row, i) => (
                  <tr key={i}>
                    <td>{row.company_name}</td>
                    <td><AuthIcon value={row.fotos} /></td>
                    <td><AuthIcon value={row.videos} /></td>
                    <td><AuthIcon value={row.publicacoes} /></td>
                    <td className="td-muted">{formatDate(row.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="links-cards">
            {filtered.length === 0 ? (
              <p className="dashboard-loading">Nenhum resultado encontrado.</p>
            ) : filtered.map((row, i) => (
              <div key={i} className="link-card">
                <div className="link-card-top">
                  <p className="link-card-name">{row.company_name}</p>
                  <span className="link-card-date">{formatDate(row.submitted_at)}</span>
                </div>
                <div className="auth-card-badges">
                  <span className={`auth-badge${row.fotos ? ' auth-badge--yes' : ' auth-badge--no'}`}>
                    Fotos {row.fotos ? '✓' : '✗'}
                  </span>
                  <span className={`auth-badge${row.videos ? ' auth-badge--yes' : ' auth-badge--no'}`}>
                    Vídeos {row.videos ? '✓' : '✗'}
                  </span>
                  <span className={`auth-badge${row.publicacoes ? ' auth-badge--yes' : ' auth-badge--no'}`}>
                    Publicações {row.publicacoes ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
