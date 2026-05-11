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

// PT-PT: Validação de NIF português pelo algoritmo oficial (módulo 11)
export function validateNIF(nif) {
  const digits = nif.replace(/\s/g, '')
  if (!/^\d{9}$/.test(digits)) return false
  const firstDigit = parseInt(digits[0])
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(firstDigit)) return false
  let sum = 0
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]) * (9 - i)
  }
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder
  return checkDigit === parseInt(digits[8])
}
