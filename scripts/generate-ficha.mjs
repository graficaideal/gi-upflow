/**
 * Gera public/gi-ficha.pdf — ficha de informações da Gráfica Ideal de Águeda.
 * Documento para download pelo cliente durante o preenchimento do formulário.
 *
 * Executar: node scripts/generate-ficha.mjs
 */

import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const __dir   = dirname(fileURLToPath(import.meta.url))
const root    = join(__dir, '..')

const { Resvg } = require('@resvg/resvg-js')
const { jsPDF } = require(join(root, 'node_modules/jspdf/dist/jspdf.node.min.js'))

// ── Logo SVG → PNG base64 ───────────────────────────────────────────────────
const svgStr     = readFileSync(join(root, 'public/logo.svg'), 'utf8')
const resvg      = new Resvg(svgStr, { fitTo: { mode: 'width', value: 140 } })
const logoPngB64 = `data:image/png;base64,${resvg.render().asPng().toString('base64')}`

// ── Cores ────────────────────────────────────────────────────────────────────
const DARK   = [51,  63,  72]
const YELLOW = [224, 203, 75]
const WHITE  = [255, 255, 255]
const LIGHT  = [190, 195, 200]
const LABEL  = [100, 110, 120]
const INK    = [30,  35,  40]

// ── Documento A4 ─────────────────────────────────────────────────────────────
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
doc.text('Gráfica Ideal de Águeda — Indústrias Gráficas, SA', titleX, logoY + 8)

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...YELLOW)
doc.text('informações gerais', titleX, logoY + 17)

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
  doc.text(title.toLowerCase(), margin + 4, y + 5.5)
  y += 12
}

function field(label, value) {
  checkBreak(7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...LABEL)
  doc.text(`${label.toLowerCase()}:`, margin + 2, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(value, margin + 52, y)
  y += 6.5
}

// ── Secção 1 — Identificação ─────────────────────────────────────────────────
section('1. identificação')
field('designação social', 'Gráfica Ideal de Águeda — Indústrias Gráficas, SA')
field('nif',               '500 213 844')
field('morada',            'Rua da Indústria, 450 — Covão')
field('código postal',     '3750-883 Valongo do Vouga')
y += 4

// ── Secção 2 — Contactos Gerais ──────────────────────────────────────────────
section('2. contactos gerais')
field('telefone', '234 630 400')
field('telemóvel', '935 225 050')
field('email',    'geral@graficaideal.pt')
field('website',  'www.graficaideal.pt')
y += 4

// ── Secção 3 — Dados Bancários ───────────────────────────────────────────────
section('3. dados bancários')
field('iban',      'PT50 0007 0628 0000 2020 0076 9')
field('bic/swift', 'BESCPTPL')
y += 4

// ── Secção 4 — Contactos Departamentais ─────────────────────────────────────
section('4. contactos departamentais')
field('encomendas',   'encomendas@graficaideal.pt')
field('orçamentação', 'orcamentacao@graficaideal.pt')
field('financeiro',   'financeiro@graficaideal.pt')
field('marketing',    'marketing@graficaideal.pt')
field('qualidade',    'qualidade@graficaideal.pt')

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
    'gráfica ideal de águeda — indústrias gráficas, sa | geral@graficaideal.pt | www.graficaideal.pt',
    pageW / 2,
    pageH - footerH + 7.5,
    { align: 'center' },
  )
}

// ── Guardar ──────────────────────────────────────────────────────────────────
const outPath = join(root, 'public/gi-ficha.pdf')
writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')))
console.log(`✓ PDF gerado: ${outPath}`)
