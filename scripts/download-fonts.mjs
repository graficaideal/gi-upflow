/**
 * Converte os WOFF1 do @fontsource/dm-sans para TTF e guarda em src/assets/fonts/.
 * Executar: node scripts/download-fonts.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { inflateSync } from 'zlib'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')
const dest  = join(root, 'src', 'assets', 'fonts')

mkdirSync(dest, { recursive: true })

/**
 * Converte um buffer WOFF1 para TTF (sfnt).
 * Especificação: https://www.w3.org/TR/WOFF/
 */
function woff1ToTtf(woff) {
  // ── Cabeçalho WOFF (44 bytes) ──────────────────────────────────────────────
  const sig = woff.readUInt32BE(0)
  if (sig !== 0x774F4646) throw new Error('Não é um ficheiro WOFF1 válido')

  const flavor    = woff.readUInt32BE(4)
  const numTables = woff.readUInt16BE(12)

  // ── Directório de tabelas WOFF (20 bytes por entrada) ─────────────────────
  const woffDir = []
  for (let i = 0; i < numTables; i++) {
    const base = 44 + i * 20
    woffDir.push({
      tag:          woff.slice(base, base + 4).toString('ascii'),
      offset:       woff.readUInt32BE(base + 4),
      compLength:   woff.readUInt32BE(base + 8),
      origLength:   woff.readUInt32BE(base + 12),
      origChecksum: woff.readUInt32BE(base + 16),
    })
  }

  // Ordenar por tag (requisito sfnt)
  woffDir.sort((a, b) => a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)

  // ── Descomprimir tabelas ───────────────────────────────────────────────────
  const tables = woffDir.map(entry => {
    const raw = woff.slice(entry.offset, entry.offset + entry.compLength)
    const data = entry.compLength < entry.origLength ? inflateSync(raw) : raw
    // Padding para múltiplo de 4
    const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4)
    data.copy(padded)
    return { ...entry, data: padded }
  })

  // ── Offset table sfnt (12 bytes) ──────────────────────────────────────────
  const n = numTables
  const searchRange   = Math.pow(2, Math.floor(Math.log2(n))) * 16
  const entrySelector = Math.floor(Math.log2(n))
  const rangeShift    = n * 16 - searchRange

  const offsetTable = Buffer.alloc(12)
  offsetTable.writeUInt32BE(flavor, 0)
  offsetTable.writeUInt16BE(n, 4)
  offsetTable.writeUInt16BE(searchRange, 6)
  offsetTable.writeUInt16BE(entrySelector, 8)
  offsetTable.writeUInt16BE(rangeShift, 10)

  // ── Calcular offsets finais das tabelas ───────────────────────────────────
  let dataOffset = 12 + n * 16  // após offset table + table directory
  for (const t of tables) {
    t.sfntOffset = dataOffset
    dataOffset += t.data.length
  }

  // ── Table directory sfnt (16 bytes por entrada) ───────────────────────────
  const tableDir = Buffer.alloc(n * 16)
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i]
    const base = i * 16
    tableDir.write(t.tag, base, 4, 'ascii')
    tableDir.writeUInt32BE(t.origChecksum, base + 4)
    tableDir.writeUInt32BE(t.sfntOffset, base + 8)
    tableDir.writeUInt32BE(t.origLength, base + 12)
  }

  return Buffer.concat([offsetTable, tableDir, ...tables.map(t => t.data)])
}

const variants = [
  { src: 'dm-sans-latin-400-normal.woff', out: 'DMSans-Regular.ttf' },
  { src: 'dm-sans-latin-700-normal.woff', out: 'DMSans-Bold.ttf'    },
  { src: 'dm-sans-latin-400-italic.woff', out: 'DMSans-Italic.ttf'  },
]

const fontsource = join(root, 'node_modules/@fontsource/dm-sans/files')

for (const { src, out } of variants) {
  const woff = readFileSync(join(fontsource, src))
  const ttf  = woff1ToTtf(woff)
  const outPath = join(dest, out)
  writeFileSync(outPath, ttf)
  console.log(`✓ ${out} (${ttf.length} bytes)`)
}

console.log('\nFontes prontas em src/assets/fonts/')
