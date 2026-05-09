import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getLinkById } from '../hooks/useLinks'
import './LinkDetail.css'

const STATUS_MAP = {
  pending:   { label: 'Pendente',  cls: 'badge-pending' },
  opened:    { label: 'Aberto',    cls: 'badge-opened' },
  completed: { label: 'Concluído', cls: 'badge-completed' },
  expired:   { label: 'Expirado',  cls: 'badge-expired' },
}

const AUTH_LABELS = {
  fotos:       'Fotografias',
  videos:      'Vídeos',
  publicacoes: 'Publicações Corporativas',
}
const AUTH_ORDER = ['fotos', 'videos', 'publicacoes']

const DEPT_LABELS = { compras: 'Dep. Compras', financeiro: 'Dep. Financeiro', marketing: 'Dep. Marketing' }
const DEPT_ORDER  = ['compras', 'financeiro', 'marketing']

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  )
}

function openMailto(formUrl) {
  const subject = 'Dados Cadastrais — Gráfica Ideal de Águeda'
  const body = `Exmo(a). Senhor(a),

A Gráfica Ideal de Águeda vem por este meio solicitar o preenchimento/atualização dos vossos dados cadastrais, essenciais para a manutenção de uma relação comercial eficiente e em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).

Para proceder ao preenchimento, basta aceder ao seguinte link:

${formUrl}

O processo é simples, rápido e seguro. Após a submissão, os vossos dados ficarão registados na nossa base de dados e serão utilizados exclusivamente para fins comerciais inerentes à nossa relação.

Caso tenham alguma dúvida, não hesitem em contactar-nos.

Com os melhores cumprimentos,`
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
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
    const url = `${import.meta.env.VITE_APP_URL || window.location.origin}/form/${link.token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <div className="detail-state">A carregar…</div>
  if (error)   return <div className="detail-state detail-state--error">{error}</div>
  if (!link)   return null

  const s = STATUS_MAP[link.status] ?? { label: link.status, cls: '' }
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const formUrl = `${appUrl}/form/${link.token}`
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
            <p className="detail-meta-label">Designação Comercial</p>
            <h2 className="detail-client">{link.commercial_name}</h2>
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
          {link.opened_at && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Aberto em</span>
              <span className="detail-meta-value">{formatDate(link.opened_at)}</span>
            </div>
          )}
          {link.submitted_at && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Submetido em</span>
              <span className="detail-meta-value">{formatDate(link.submitted_at)}</span>
            </div>
          )}
        </div>

        {(link.status === 'pending' || link.status === 'opened') && (
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
            <button className="btn-secondary btn-mail-detail" onClick={() => openMailto(formUrl)}>
              <MailIcon />
              Enviar por Email
            </button>
          </div>
        )}
      </div>

      {/* Submission data */}
      {sub && (
        <div className="submission-section">
          <h3 className="submission-title">Dados Submetidos</h3>

          {/* Card 1 — Dados da Empresa */}
          <div className="detail-card">
            <h4 className="sub-card-title">Dados da Empresa</h4>
            <div className="sub-fields">
              <Field label="Designação Fiscal"  value={sub.fiscal_name} />
              <Field label="NIF"              value={sub.nif} />
              <Field label="Morada"           value={sub.address} />
              <Field label="Código Postal"    value={sub.codigo_postal} />
              <Field label="Localidade"       value={sub.city} />
              <Field label="Telefone"         value={sub.phone} />
              <Field label="Telemóvel"        value={sub.mobile} />
              <Field label="Email"            value={sub.email} />
              <Field label="Site"             value={sub.website} />
            </div>
          </div>

          {/* Card 2 — Contactos por Departamento */}
          <div className="detail-card">
            <h4 className="sub-card-title">Contactos por Departamento</h4>
            <div className="dept-sub-cards">
              {DEPT_ORDER.map(dept => {
                const c = sub.contacts.find(x => x.department === dept)
                return (
                  <div key={dept} className="dept-sub-card">
                    <p className="contact-dept">{DEPT_LABELS[dept]}</p>
                    {c ? (
                      <>
                        <Field label="Nome"      value={c.name} />
                        <Field label="Email"     value={c.email} />
                        <Field label="Telefone"  value={c.phone} />
                        <Field label="Telemóvel" value={c.mobile} />
                      </>
                    ) : (
                      <p className="dept-empty">Sem dados registados</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card 3 — Faturação */}
          <div className="detail-card">
            <h4 className="sub-card-title">Faturação</h4>
            <div className="auth-list">
              <div className="auth-row">
                <span className="auth-label">Email de faturação</span>
                <span className="auth-value">
                  {sub.billing_same_email ? 'Mesmo do Dep. Financeiro' : (sub.billing_email || '—')}
                </span>
              </div>
              <div className="auth-row">
                <span className="auth-label">Modo de envio</span>
                <span className="auth-value">
                  {sub.billing_mode === 'eletronico' ? 'Eletrónico'
                    : sub.billing_mode === 'papel' ? 'Papel'
                    : '—'}
                </span>
              </div>
              {sub.billing_notes && (
                <div className="auth-row">
                  <span className="auth-label">Notas</span>
                  <span className="auth-value">{sub.billing_notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 4 — Consentimento RGPD */}
          <div className="detail-card">
            <h4 className="sub-card-title">Consentimento RGPD</h4>
            <div className="auth-list">
              <div className="auth-row">
                <span className="auth-label">Aceite</span>
                <span className={`auth-value ${sub.rgpd_consent ? 'auth-yes' : 'auth-no'}`}>
                  {sub.rgpd_consent ? 'Sim' : 'Não'}
                </span>
              </div>
              {sub.rgpd_consent?.accepted_at && (
                <div className="auth-row">
                  <span className="auth-label">Data e hora de aceitação</span>
                  <span className="auth-value auth-date">
                    {formatDateTime(sub.rgpd_consent.accepted_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 5 — Autorizações de Imagem */}
          {sub.authorizations.length > 0 && (
            <div className="detail-card">
              <h4 className="sub-card-title">Autorizações de Imagem</h4>
              <div className="auth-list">
                {AUTH_ORDER
                  .map(type => sub.authorizations.find(a => a.type === type))
                  .filter(Boolean)
                  .map(a => (
                    <div key={a.id} className="auth-row">
                      <span className="auth-label">{AUTH_LABELS[a.type] ?? a.type}</span>
                      <span className={`auth-value ${a.authorized ? 'auth-yes' : 'auth-no'}`}>
                        {a.authorized ? '✅ Autorizado' : '❌ Não Autorizado'}
                      </span>
                    </div>
                  ))
                }
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
  return (
    <div className="sub-field">
      <span className="sub-field-label">{label}</span>
      <span className="sub-field-value">{value || '—'}</span>
    </div>
  )
}
