// PT-PT: 9 dígitos, formato XXX XXX XXX
const NIF_FORMAT = {
  maxDigits: 9,
  groups: [3, 3, 3],
  separator: ' ',
}

export function formatNif(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, NIF_FORMAT.maxDigits)
  let result = ''
  let pos = 0
  for (const size of NIF_FORMAT.groups) {
    if (pos >= digits.length) break
    if (pos > 0) result += NIF_FORMAT.separator
    result += digits.slice(pos, pos + size)
    pos += size
  }
  return result
}
