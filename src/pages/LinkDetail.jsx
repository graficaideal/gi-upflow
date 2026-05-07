import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getLinkById } from '../hooks/useLinks'
import './LinkDetail.css'

const STATUS_MAP = {
  pending:   { label: 'Pendente',  cls: 'badge-pending' },
  completed: { label: 'Concluído', cls: 'badge-completed' },
  expired:   { label: 'Expirado',  cls: 'badge-expired' },
}

const AUTH_LABELS = { fotos: 'Fotografias', videos: 'Vídeos', publicacoes: 'Publicações' }
const DEPT_LABELS = { compras: 'Compras', financeiro: 'Financeiro', marketing: 'Marketing' }

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function LinkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [link, setLink] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getLinkById(id)
      .then(data => { setLink(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  function copyLink() {
    const url = `${window.location.origin}/form/${link.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div className="detail-state">A carregar…</div>
  if (error)   return <div className="detail-state detail-state--error">{error}</div>
  if (!link)   return null

  const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
  const formUrl = `${window.location.origin}/form/${link.token}`
  const sub = link.submission

  return (
    <div className="link-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>
      </div>

      {/* Link info card */}
      <div className="detail-card">
        <div className="detail-card-header">
          <div>
            <h2 className="detail-client">{link.client_name}</h2>
            <p className="detail-company">{link.company_name}</p>
          </div>
          <span className={`status-badge ${s.cls}`}>{s.label}</span>
        </div>

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-meta-label">Criado em</span>
            <span className="detail-meta-value">{formatDate(link.created_at)}</span>
          </div>
          <div className="detail-meta-item">
            <span className="detail-meta-label">Prazo</span>
            <span className="detail-meta-value">{formatDate(link.expires_at)}</span>
          </div>
          {link.submitted_at && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Submetido em</span>
              <span className="detail-meta-value">{formatDate(link.submitted_at)}</span>
            </div>
          )}
        </div>

        {link.status === 'pending' && (
          <div className="detail-link-row">
            <input
              className="detail-link-input"
              readOnly
              value={formUrl}
              onFocus={e => e.target.select()}
            />
            <button className="btn-copy-detail" onClick={copyLink}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {/* Submission data */}
      {sub && (
        <div className="submission-section">
          <h3 className="submission-title">Dados Submetidos</h3>

          {/* Company data */}
          <div className="detail-card">
            <h4 className="sub-card-title">Empresa</h4>
            <div className="sub-fields">
              <Field label="Nome" value={sub.company_name} />
              <Field label="NIF" value={sub.nif} />
              <Field label="Morada" value={sub.morada} />
              <Field label="Código Postal" value={sub.codigo_postal} />
              <Field label="Localidade" value={sub.localidade} />
              <Field label="Telefone" value={sub.telefone} />
              <Field label="Telemóvel" value={sub.telemovel} />
              <Field label="Email" value={sub.email} />
              <Field label="Website" value={sub.site} />
            </div>
          </div>

          {/* Contacts */}
          {sub.contacts.length > 0 && (
            <div className="detail-card">
              <h4 className="sub-card-title">Contactos</h4>
              <div className="contacts-grid">
                {sub.contacts.map(c => (
                  <div key={c.id} className="contact-block">
                    <p className="contact-dept">{DEPT_LABELS[c.department] ?? c.department}</p>
                    <Field label="Nome" value={c.nome} />
                    <Field label="Email" value={c.email} />
                    {c.telefone  && <Field label="Telefone"  value={c.telefone} />}
                    {c.telemovel && <Field label="Telemóvel" value={c.telemovel} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authorizations */}
          {sub.authorizations.length > 0 && (
            <div className="detail-card">
              <h4 className="sub-card-title">Autorizações de Comunicação</h4>
              <div className="auth-list">
                {sub.authorizations.map(a => (
                  <div key={a.id} className="auth-row">
                    <span className="auth-label">{AUTH_LABELS[a.type] ?? a.type}</span>
                    <span className={`auth-value ${a.authorized ? 'auth-yes' : 'auth-no'}`}>
                      {a.authorized ? 'Autorizado' : 'Não autorizado'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RGPD */}
          {sub.rgpd_consent && (
            <div className="detail-card">
              <h4 className="sub-card-title">RGPD</h4>
              <div className="auth-row">
                <span className="auth-label">Consentimento</span>
                <span className="auth-value auth-yes">Aceite em {formatDate(sub.rgpd_consent.accepted_at)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!sub && link.status === 'completed' && (
        <p className="detail-state">Dados da submissão não encontrados.</p>
      )}
    </div>
  )
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="sub-field">
      <span className="sub-field-label">{label}</span>
      <span className="sub-field-value">{value}</span>
    </div>
  )
}
