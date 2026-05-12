/**
 * Gera public/gi-ficha.pdf — ficha de fornecedor da Gráfica Ideal de Águeda.
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

// ── Fontes DM Sans ────────────────────────────────────────────────────────────
const fontsDir = join(root, 'src', 'assets', 'fonts')
const dmSansRegularB64 = readFileSync(join(fontsDir, 'DMSans-Regular.ttf')).toString('base64')
const dmSansBoldB64    = readFileSync(join(fontsDir, 'DMSans-Bold.ttf')).toString('base64')
const dmSansItalicB64  = readFileSync(join(fontsDir, 'DMSans-Italic.ttf')).toString('base64')

// ── Logo SVG → PNG base64 ───────────────────────────────────────────────────
const svgStr    = readFileSync(join(root, 'public/logo.svg'), 'utf8')
const resvg     = new Resvg(svgStr, { fitTo: { mode: 'width', value: 140 } })
const logoPngB64 = `data:image/png;base64,${resvg.render().asPng().toString('base64')}`

// ── Cores ────────────────────────────────────────────────────────────────────
const DARK   = [51,  63,  72]    // #333F48
const YELLOW = [224, 203, 75]    // #e0cb4b
const WHITE  = [255, 255, 255]
const LIGHT  = [190, 195, 200]
const LABEL  = [100, 110, 120]
const INK    = [30,  35,  40]

// ── Documento A4 ─────────────────────────────────────────────────────────────
const doc      = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

doc.addFileToVFS('DMSans-Regular.ttf', dmSansRegularB64)
doc.addFont('DMSans-Regular.ttf', 'DMSans', 'normal')
doc.addFileToVFS('DMSans-Bold.ttf', dmSansBoldB64)
doc.addFont('DMSans-Bold.ttf', 'DMSans', 'bold')
doc.addFileToVFS('DMSans-Italic.ttf', dmSansItalicB64)
doc.addFont('DMSans-Italic.ttf', 'DMSans', 'italic')
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
doc.setFont('DMSans', 'bold')
doc.setFontSize(13)
doc.setTextColor(...WHITE)
doc.text('Gráfica Ideal de Águeda — Indústrias Gráficas, SA', titleX, logoY + 7)

doc.setFont('DMSans', 'normal')
doc.setFontSize(9)
doc.setTextColor(...LIGHT)
doc.text('Ficha de Fornecedor', titleX, logoY + 15)

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
  doc.setFont('DMSans', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...WHITE)
  doc.text(title, margin + 4, y + 5.5)
  y += 12
}

function field(label, value) {
  checkBreak(7)
  doc.setFont('DMSans', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...LABEL)
  doc.text(`${label}:`, margin + 2, y)
  doc.setFont('DMSans', 'normal')
  doc.setTextColor(...INK)
  doc.text(value, margin + 52, y)
  y += 6.5
}

// ── Secção 1 — Dados da Empresa ──────────────────────────────────────────────
section('1. Dados da Empresa')
field('Designação',    'Gráfica Ideal de Águeda — Indústrias Gráficas, SA')
field('NIF',           '500 213 844')
field('Morada',        'Rua da Indústria, 450 - Covão')
field('Código Postal', '3750-883')
field('Localidade',    'Valongo do Vouga')
field('Telefone',      '234 630 400')
field('Telemóvel',     '935 225 050')
field('Email',         'geral@graficaideal.pt')
field('Site',          'www.graficaideal.pt')
y += 4

// ── Secção 2 — Dados Bancários ───────────────────────────────────────────────
section('2. Dados Bancários')
field('IBAN',      'PT50 0007 0628 0000 2020 0076 9')
field('BIC/SWIFT', 'BESCPTPL')
y += 4

// ── Secção 3 — Contactos por Departamento ───────────────────────────────────
section('3. Contactos por Departamento')
field('Encomendas', 'encomendas@graficaideal.pt')
field('Orçamentação',       'orcamentacao@graficaideal.pt')
field('Financeiro',         'financeiro@graficaideal.pt')
field('Marketing',          'marketing@graficaideal.pt')
field('Qualidade',          'qualidade@graficaideal.pt')

// ── Rodapé em todas as páginas ───────────────────────────────────────────────
const total = doc.getNumberOfPages()
for (let i = 1; i <= total; i++) {
  doc.setPage(i)
  doc.setFillColor(...YELLOW)
  doc.rect(0, pageH - footerH, pageW, footerH, 'F')
  doc.setFont('DMSans', 'normal')
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
