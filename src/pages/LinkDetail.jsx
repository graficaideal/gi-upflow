import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import dmSansRegularB64 from '../assets/fonts/DMSans-Regular.ttf?base64'
import dmSansBoldB64 from '../assets/fonts/DMSans-Bold.ttf?base64'
import dmSansItalicB64 from '../assets/fonts/DMSans-Italic.ttf?base64'
import { useParams, useNavigate } from 'react-router-dom'
import { getLinkById, markEmailSent } from '../hooks/useLinks'
import { translations } from '../utils/translations'
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

const cargoLabels = {
  'Administrador': 'Administrador',
  'Administrator': 'Administrador',
  'Diretor': 'Diretor',
  'Director': 'Diretor',
  'Responsável': 'Responsável',
  'Manager': 'Responsável',
  'Responsable': 'Responsável',
  'Técnico': 'Técnico',
  'Technician': 'Técnico',
  'Outro': 'Outro',
  'Other': 'Outro',
  'Otro': 'Outro',
}

function normalizeCargo(cargo) {
  return cargoLabels[cargo] ?? cargo
}

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

function svgToPng() {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 140
      canvas.height = 174
      canvas.getContext('2d').drawImage(img, 0, 0, 140, 174)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = '/logo.svg'
  })
}

async function downloadPDF(link) {
  const logoPng = await svgToPng()
  const sub = link.submission
  const t = translations[link.language ?? 'pt'] ?? translations.pt

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  doc.addFileToVFS('DMSans-Regular.ttf', dmSansRegularB64)
  doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal')
  doc.addFileToVFS('DMSans-Bold.ttf', dmSansBoldB64)
  doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold')
  doc.addFileToVFS('DMSans-Italic.ttf', dmSansItalicB64)
  doc.addFont('DMSans-Italic.ttf', 'DMSans', 'italic')

  const pageW = 210
  const pageH = 297
  const margin = 15
  const contentW = pageW - 2 * margin
  const footerH = 12

  const darkR = 51,   darkG = 63,  darkB = 72   // #333F48
  const yelR  = 224,  yelG  = 203, yelB  = 75   // #e0cb4b

  // ── Header ──────────────────────────────────────────────
  const headerH = 42
  doc.setFillColor(darkR, darkG, darkB)
  doc.rect(0, 0, pageW, headerH, 'F')
  doc.setFillColor(yelR, yelG, yelB)
  doc.rect(0, 0, pageW, 5, 'F')

  const logoW = 20
  const logoH = logoW * (174 / 140)
  const logoY = 5 + (headerH - 5 - logoH) / 2
  doc.addImage(logoPng, 'PNG', margin, logoY, logoW, logoH)

  const titleX = margin + logoW + 6
  doc.setFont('DMSans', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(`Ficha de Cliente — ${link.commercial_name}`, titleX, logoY + 8)

  const submittedStr = link.submitted_at
    ? new Date(link.submitted_at).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'
  doc.setFont('DMSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(190, 195, 200)
  doc.text(`Submetido em: ${submittedStr}`, titleX, logoY + 17)

  // ── Helpers ──────────────────────────────────────────────
  let y = headerH + 8

  function checkBreak(needed) {
    if (y + needed > pageH - footerH - 5) {
      doc.addPage()
      y = 15
    }
  }

  function addSectionTitle(title) {
    checkBreak(10)
    doc.setFillColor(darkR, darkG, darkB)
    doc.rect(margin, y, contentW, 8, 'F')
    doc.setFont('DMSans', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text(title, margin + 4, y + 5.5)
    y += 12
  }

  function addField(label, value) {
    checkBreak(7)
    doc.setFont('DMSans', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 110, 120)
    doc.text(`${label.toLowerCase()}:`, margin + 2, y)
    doc.setFont('DMSans', 'normal')
    doc.setTextColor(30, 35, 40)
    doc.text(value || '—', margin + 58, y)
    y += 6.5
  }

  function addSubheading(text) {
    checkBreak(9)
    doc.setFont('DMSans', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(darkR, darkG, darkB)
    doc.text(text, margin + 2, y)
    y += 6.5
  }

  // ── Secção 1 — Dados da Empresa ─────────────────────────
  addSectionTitle('1. Dados da Empresa')
  addField('Designação Comercial', link.commercial_name)
  addField('Designação Fiscal', sub.fiscal_name)
  addField('NIF', sub.nif)
  addField('Morada', sub.address)
  addField('Código Postal', sub.codigo_postal)
  addField('Localidade', sub.city)
  addField('Telefone', sub.phone)
  addField('Telemóvel', sub.mobile)
  addField('Email', sub.email)
  addField('Site', sub.website)
  y += 4

  // ── Secção 2 — Contactos por Departamento ───────────────
  addSectionTitle('2. Contactos por Departamento')
  for (const dept of DEPT_ORDER) {
    const c = sub.contacts.find(x => x.department === dept)
    addSubheading(DEPT_LABELS[dept])
    if (c) {
      addField('Nome', c.name)
      if (c.cargo) addField('Cargo', c.cargo === 'outro' ? (c.cargo_outro || '—') : normalizeCargo(c.cargo))
      addField('Email', c.email)
      addField('Telefone', c.phone)
      addField('Telemóvel', c.mobile)
    } else {
      checkBreak(6)
      doc.setFont('DMSans', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(150, 155, 160)
      doc.text('Sem dados registados', margin + 2, y)
      y += 6
    }
    y += 3
  }
  y += 1

  // ── Secção 3 — Faturação ─────────────────────────────────
  addSectionTitle('3. Faturação')
  addField(
    'Email de faturação',
    sub.billing_same_email ? 'Mesmo do Dep. Financeiro' : (sub.billing_email || '—'),
  )
  addField(
    'Modo de envio',
    sub.billing_mode === 'eletronico' ? 'Eletrónico'
      : sub.billing_mode === 'papel' ? 'Papel' : '—',
  )
  if (sub.billing_notes) addField('Observações', sub.billing_notes)
  y += 4

  // ── Secção 4 — Consentimento RGPD ────────────────────────
  addSectionTitle('4. Consentimento RGPD')
  addField('Aceite', sub.rgpd_consent ? t.yes : t.no)
  if (sub.rgpd_consent?.accepted_at) {
    addField(
      'Data e hora de aceitação',
      new Date(sub.rgpd_consent.accepted_at).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    )
  }
  y += 4

  // ── Secção 5 — Autorizações de Imagem ────────────────────
  addSectionTitle('5. Autorizações de Imagem')
  for (const type of AUTH_ORDER) {
    const a = sub.authorizations.find(x => x.type === type)
    addField(AUTH_LABELS[type] || type, a ? (a.authorized ? 'Sim' : 'Não') : '—')
  }

  // ── Rodapé em todas as páginas ───────────────────────────
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFillColor(yelR, yelG, yelB)
    doc.rect(0, pageH - footerH, pageW, footerH, 'F')
    doc.setFont('DMSans', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(darkR, darkG, darkB)
    doc.text(
      'Gráfica Ideal de Águeda — Indústrias Gráficas, SA | geral@graficaideal.pt | www.graficaideal.pt',
      pageW / 2,
      pageH - footerH + 7.5,
      { align: 'center' },
    )
  }

  // ── Nome do ficheiro ─────────────────────────────────────
  const safeName = (link.commercial_name || 'cliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  doc.save(`ficha-${safeName}-${dd}-${mm}-${yyyy}.pdf`)
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

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <polyline points="9 15 12 18 15 15"/>
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

function openMailto(formUrl, language = 'pt', commercialName = '') {
  const t = translations[language] ?? translations.pt
  const subject = t.emailSubject
  const body = t.emailBody.replace('[EMPRESA]', commercialName).replace('[LINK]', formUrl)
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function LinkDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [link, setLink] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [markingEmail, setMarkingEmail] = useState(false)

  useEffect(() => {
    getLinkById(id)
      .then(data => { setLink(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  async function handleDownloadPDF() {
    setPdfLoading(true)
    try { await downloadPDF(link) } finally { setPdfLoading(false) }
  }

  async function handleMarkEmailSent() {
    setMarkingEmail(true)
    try {
      await markEmailSent(id)
      setLink(prev => ({ ...prev, email_sent_at: new Date().toISOString() }))
    } finally {
      setMarkingEmail(false)
    }
  }

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
          <div className="detail-card-badges">
            <button
              className={`mail-status-btn${link.email_sent_at ? ' mail-status-btn--sent' : ''}`}
              onClick={handleMarkEmailSent}
              disabled={markingEmail}
              data-tooltip={link.email_sent_at
                ? `Enviado a ${formatDateTime(link.email_sent_at)} · clique para registar reenvio`
                : 'Marcar como enviado'
              }
              aria-label={link.email_sent_at ? 'Marcar reenvio' : 'Marcar como enviado'}
            >
              <MailIcon />
            </button>
            <span className={`status-badge ${s.cls}`}>{s.label}</span>
            <span
              className="lang-badge"
              style={{
                backgroundColor: { pt: '#1a5276', en: '#1e8449', es: '#922b21' }[link.language ?? 'pt'] ?? '#1a5276',
                color: '#ffffff',
              }}
            >
              {(link.language ?? 'pt').toUpperCase()}
            </span>
          </div>
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
          {link.email_sent_at && (
            <div className="detail-meta-item">
              <span className="detail-meta-label">Email enviado em</span>
              <span className="detail-meta-value detail-meta-value--sent">✓ {formatDateTime(link.email_sent_at)}</span>
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
            <button className="btn-secondary btn-mail-detail" onClick={() => openMailto(formUrl, link.language ?? 'pt', link.commercial_name ?? '')}>
              <MailIcon />
              Enviar por Email
            </button>
          </div>
        )}
        {link.status === 'completed' && sub && (
          <div className="detail-link-row">
            <button className="btn-pdf-detail" onClick={handleDownloadPDF} disabled={pdfLoading}>
              <PdfIcon />
              {pdfLoading ? 'A gerar…' : 'Descarregar PDF'}
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
                        {c.cargo && (
                          <Field label="Cargo" value={c.cargo === 'outro' ? c.cargo_outro : normalizeCargo(c.cargo)} />
                        )}
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
