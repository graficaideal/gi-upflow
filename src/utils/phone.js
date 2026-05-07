// PT-PT: 9 dígitos, formato XXX XXX XXX
const PHONE_FORMAT = {
  maxDigits: 9,
  groups: [3, 3, 3],
  separator: ' ',
}

export function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, PHONE_FORMAT.maxDigits)
  let result = ''
  let pos = 0
  for (const size of PHONE_FORMAT.groups) {
    if (pos >= digits.length) break
    if (pos > 0) result += PHONE_FORMAT.separator
    result += digits.slice(pos, pos + size)
    pos += size
  }
  return result
}
