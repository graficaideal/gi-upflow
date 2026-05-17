import { useState } from 'react'
import { jsPDF } from 'jspdf'
import dmSansRegularB64 from '../../assets/fonts/DMSans-Regular.ttf?base64'
import dmSansBoldB64 from '../../assets/fonts/DMSans-Bold.ttf?base64'
import dmSansItalicB64 from '../../assets/fonts/DMSans-Italic.ttf?base64'

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

async function generateSummaryPDF({ formData, t, commercialName }) {
  const logoPng = await svgToPng()
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

  const darkR = 51, darkG = 63, darkB = 72
  const yelR = 224, yelG = 203, yelB = 75

  // Header
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
  doc.text(commercialName || '', titleX, logoY + 8)

  const now = new Date()
  const submittedStr = now.toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  doc.setFont('DMSans', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(190, 195, 200)
  doc.text(submittedStr, titleX, logoY + 17)

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

  // Section 1 — Company data
  addSectionTitle(`1. ${t.step1Title}`)
  addField(t.fiscalName, formData.fiscal_name)
  addField(t.nif, formData.nif)
  addField(t.address, formData.morada)
  addField(t.postalCode, formData.codigo_postal)
  addField(t.city, formData.localidade)
  addField(t.phone, formData.telefone)
  addField(t.mobile, formData.telemovel)
  addField(t.email, formData.email)
  addField(t.website, formData.site)
  y += 4

  // Section 2 — Department contacts
  addSectionTitle(`2. ${t.step2Title}`)
  const depts = [
    { key: 'compras',    label: t.deptCompras },
    { key: 'financeiro', label: t.deptFinanceiro },
    { key: 'marketing',  label: t.deptMarketing },
  ]
  for (const dept of depts) {
    const nome = formData[`${dept.key}_nome`]
    addSubheading(dept.label)
    if (nome) {
      addField(t.name, nome)
      const cargo = formData[`${dept.key}_cargo`]
      if (cargo) {
        const display = cargo === 'outro' ? (formData[`${dept.key}_cargo_outro`] || '—') : cargo
        addField(t.cargo, display)
      }
      addField(t.email, formData[`${dept.key}_email`])
      addField(t.phone, formData[`${dept.key}_telefone`])
      addField(t.mobile, formData[`${dept.key}_telemovel`])
    } else {
      checkBreak(6)
      doc.setFont('DMSans', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(150, 155, 160)
      doc.text(t.noDataLabel, margin + 2, y)
      y += 6
    }
    y += 3
  }
  y += 1

  // Section 3 — Billing
  addSectionTitle(`3. ${t.billingTitle}`)
  addField(
    t.billingEmail,
    formData.billing_same_email ? t.billingSameAsFinance : (formData.billing_email || '—'),
  )
  addField(
    t.billingMode,
    formData.billing_mode === 'eletronico' ? t.billingModeElectronic
      : formData.billing_mode === 'papel' ? t.billingModePaper : '—',
  )
  if (formData.billing_notes) addField(t.billingNotes, formData.billing_notes)
  y += 4

  // Section 4 — RGPD
  addSectionTitle(`4. ${t.rgpdTitle}`)
  addField(t.rgpdAcceptedLabel, formData.rgpd_accepted ? t.yes : t.no)
  y += 4

  // Section 5 — Authorizations
  addSectionTitle(`5. ${t.step4Title}`)
  addField(t.authPhotos, formData.fotos === 'sim' ? t.yes : t.no)
  addField(t.authVideos, formData.videos === 'sim' ? t.yes : t.no)
  addField(t.authPublications, formData.publicacoes === 'sim' ? t.yes : t.no)

  // Footer on all pages (always PT)
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

  const safeName = (commercialName || 'cliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  doc.save(`resumo-${safeName}-${dd}-${mm}-${yyyy}.pdf`)
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 24px',
  background: '#e0cb4b',
  color: '#333F48',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '14px',
  textDecoration: 'none',
  fontFamily: 'Outfit, sans-serif',
  border: 'none',
  cursor: 'pointer',
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

export default function FormSuccess({ t, formData, commercialName }) {
  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleDownloadSummary() {
    setPdfLoading(true)
    try {
      await generateSummaryPDF({ formData, t, commercialName })
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="form-page form-page--center" style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <div className="form-message-card">
        <div className="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <h2>{t.successTitle}</h2>
        <p>{t.successText}</p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/gi-ficha.pdf" download target="_blank" rel="noopener noreferrer" style={btnStyle}>
            <DownloadIcon />
            {t.downloadPdf}
          </a>
          {formData && (
            <button onClick={handleDownloadSummary} disabled={pdfLoading} style={btnStyle}>
              <DownloadIcon />
              {pdfLoading ? '…' : t.downloadSummary}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
