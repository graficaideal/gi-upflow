function escXml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tag(name, value) {
  return `<${name}>${escXml(value)}</${name}>`
}

export function generateClientXML(links) {
  const clientesXml = links.map(link => {
    const sub = link.submission
    const contacts = sub.contacts ?? []
    const billingEmail = sub.billing_same_email ? sub.email : sub.billing_email

    const contactosXml = contacts.map(c => {
      const cargoVal = c.cargo === 'outro' ? (c.cargo_outro || '') : (c.cargo || '')
      return [
        '      <contacto>',
        `        ${tag('departamento', c.department)}`,
        `        ${tag('nome', c.name)}`,
        `        ${tag('cargo', cargoVal)}`,
        `        ${tag('email', c.email)}`,
        `        ${tag('telefone', c.phone)}`,
        `        ${tag('telemovel', c.mobile)}`,
        '      </contacto>',
      ].join('\n')
    }).join('\n')

    return [
      '    <cliente>',
      `      ${tag('nif', sub.nif)}`,
      `      ${tag('designacao_fiscal', sub.fiscal_name)}`,
      `      ${tag('designacao_comercial', link.commercial_name)}`,
      `      ${tag('morada', sub.address)}`,
      `      ${tag('codigo_postal', sub.codigo_postal)}`,
      `      ${tag('localidade', sub.city)}`,
      `      ${tag('telefone_geral', sub.phone)}`,
      `      ${tag('telemovel_geral', sub.mobile)}`,
      `      ${tag('email_geral', sub.email)}`,
      `      ${tag('website', sub.website)}`,
      '      <faturacao>',
      `        ${tag('email', billingEmail)}`,
      `        ${tag('modo_envio', sub.billing_mode)}`,
      `        ${tag('observacoes', sub.billing_notes)}`,
      '      </faturacao>',
      '      <contactos>',
      contactosXml,
      '      </contactos>',
      '      <upflow_meta>',
      `        ${tag('link_id', link.id)}`,
      `        ${tag('vendedor', link.vendor_name)}`,
      `        ${tag('data_submissao', link.submitted_at)}`,
      `        ${tag('idioma', link.language)}`,
      '      </upflow_meta>',
      '    </cliente>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<upflow_export>',
    '  <metadata>',
    `    ${tag('exported_at', new Date().toISOString())}`,
    `    ${tag('exported_by', 'UpFlow — Gráfica Ideal de Águeda')}`,
    '    <version>1.0</version>',
    `    ${tag('total_records', String(links.length))}`,
    '  </metadata>',
    '  <clientes>',
    clientesXml,
    '  </clientes>',
    '</upflow_export>',
  ].join('\n')
}

export function downloadXML(xmlStr, filename) {
  const blob = new Blob([xmlStr], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function xmlFilename(commercialName) {
  const safe = (commercialName || 'cliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `upflow-${safe}-${dd}-${mm}-${now.getFullYear()}.xml`
}
