/**
 * Gera public/gi-ficha.pdf — template em branco para preenchimento manual.
 * Mesmo layout visual que o PDF gerado dinamicamente em LinkDetail.jsx.
 *
 * Executar: node scripts/generate-ficha.mjs
 */

import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require  = createRequire(import.meta.url)
const __dir    = dirname(fileURLToPath(import.meta.url))
const root     = join(__dir, '..')

const { Resvg }  = require('@resvg/resvg-js')
const { jsPDF }  = require(join(root, 'node_modules/jspdf/dist/jspdf.node.min.js'))

// ── Logo SVG → PNG base64 ───────────────────────────────────────────────────
const svgStr = readFileSync(join(root, 'public/logo.svg'), 'utf8')
const resvg  = new Resvg(svgStr, { fitTo: { mode: 'width', value: 140 } })
const logoPngBuf  = resvg.render().asPng()
const logoPngB64  = `data:image/png;base64,${logoPngBuf.toString('base64')}`

// ── Helpers de cor ───────────────────────────────────────────────────────────
const DARK   = [51,  63,  72]   // #333F48
const YELLOW = [224, 203, 75]   // #e0cb4b
const WHITE  = [255, 255, 255]
const LIGHT  = [190, 195, 200]
const LABEL  = [100, 110, 120]
const INK    = [30,  35,  40]
const DIMMED = [150, 155, 160]

// ── Documento ────────────────────────────────────────────────────────────────
const doc      = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
const pageW    = 210
const pageH    = 297
const margin   = 15
const contentW = pageW - 2 * margin
const footerH  = 12

// ── Cabeçalho ────────────────────────────────────────────────────────────────
const headerH = 42
doc.setFillColor(...DARK)
doc.rect(0, 0, pageW, headerH, 'F')
doc.setFillColor(...YELLOW)
doc.rect(0, 0, pageW, 5, 'F')

const logoW = 20
const logoH = logoW * (174 / 140)
const logoY = 5 + (headerH - 5 - logoH) / 2
doc.addImage(logoPngB64, 'PNG', margin, logoY, logoW, logoH)

const titleX = margin + logoW + 6
doc.setFont('helvetica', 'bold')
doc.setFontSize(13)
doc.setTextColor(...WHITE)
doc.text('Ficha de Cliente — Gráfica Ideal de Águeda', titleX, logoY + 8)

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...LIGHT)
doc.text('Preencha e entregue este formulário à nossa equipa comercial.', titleX, logoY + 17)

// ── Helpers de layout ────────────────────────────────────────────────────────
let y = headerH + 8

function checkBreak(needed) {
  if (y + needed > pageH - footerH - 5) {
    doc.addPage()
    y = 15
  }
}

function section(title) {
  checkBreak(12)
  doc.setFillColor(...DARK)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...WHITE)
  doc.text(title, margin + 4, y + 5.5)
  y += 12
}

function field(label, lineW = contentW - 2) {
  checkBreak(9)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...LABEL)
  doc.text(label, margin + 2, y)
  y += 4
  doc.setDrawColor(...DIMMED)
  doc.setLineWidth(0.25)
  doc.line(margin + 2, y, margin + 2 + lineW, y)
  y += 5.5
}

function subheading(text) {
  checkBreak(9)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(text, margin + 2, y)
  y += 6.5
}

// ── Secção 1 — Dados da Empresa ──────────────────────────────────────────────
section('1. Dados da Empresa')
field('Designação Comercial')
field('Designação Fiscal')
field('NIF')
field('Morada')
const halfW = (contentW - 6) / 2
field('Código Postal', halfW)
// reposicionar para Localidade na mesma linha vertical (aproximação simples: linha seguida)
field('Localidade')
field('Telefone', halfW)
field('Telemóvel')
field('Email')
field('Site')
y += 4

// ── Secção 2 — Contactos por Departamento ───────────────────────────────────
section('2. Contactos por Departamento')
for (const dept of ['Dep. Compras', 'Dep. Financeiro', 'Dep. Marketing']) {
  subheading(dept)
  field('Nome')
  field('Email')
  field('Telefone', halfW)
  field('Telemóvel')
  y += 2
}
y += 2

// ── Secção 3 — Faturação ─────────────────────────────────────────────────────
section('3. Faturação')
field('Email de faturação')
field('Modo de envio  (Eletrónico / Papel)')
field('Observações')
y += 4

// ── Secção 4 — Consentimento RGPD ────────────────────────────────────────────
section('4. Consentimento RGPD')
checkBreak(12)
doc.setFont('helvetica', 'normal')
doc.setFontSize(8)
doc.setTextColor(...INK)
const rgpdText =
  'Declaro que li e aceito a política de privacidade da Gráfica Ideal de Águeda, ' +
  'autorizando o tratamento dos dados pessoais aqui fornecidos para fins exclusivamente comerciais.'
const split = doc.splitTextToSize(rgpdText, contentW - 4)
doc.text(split, margin + 2, y)
y += split.length * 4.5 + 4
field('Assinatura')
field('Data')
y += 4

// ── Secção 5 — Autorizações de Imagem ────────────────────────────────────────
section('5. Autorizações de Imagem')
for (const label of ['Fotografias', 'Vídeos', 'Publicações Corporativas']) {
  checkBreak(8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...LABEL)
  doc.text(label + ':', margin + 2, y)
  // caixas Sim / Não
  const boxY = y - 3.5
  ;[[margin + 58, 'Sim'], [margin + 75, 'Não']].forEach(([bx, bl]) => {
    doc.setDrawColor(...DIMMED)
    doc.setLineWidth(0.3)
    doc.rect(bx, boxY, 4, 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(bl, bx + 5.5, y)
  })
  y += 7
}

// ── Rodapé em todas as páginas ───────────────────────────────────────────────
const total = doc.getNumberOfPages()
for (let i = 1; i <= total; i++) {
  doc.setPage(i)
  doc.setFillColor(...YELLOW)
  doc.rect(0, pageH - footerH, pageW, footerH, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DARK)
  doc.text(
    'Gráfica Ideal de Águeda — Indústrias Gráficas, SA | geral@graficaideal.pt | www.graficaideal.pt',
    pageW / 2,
    pageH - footerH + 7.5,
    { align: 'center' },
  )
}

// ── Guardar ──────────────────────────────────────────────────────────────────
const outPath = join(root, 'public/gi-ficha.pdf')
writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')))
console.log(`✓ PDF gerado: ${outPath}`)
