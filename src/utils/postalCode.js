// PT-PT: formato XXXX-XXX para futura internacionalização
export function formatPostalCode(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 7)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}
