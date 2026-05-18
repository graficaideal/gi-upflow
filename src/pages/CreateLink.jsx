import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { createLink, getVendors } from '../hooks/useLinks'
import { translations } from '../utils/translations'
import './CreateLink.css'

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

function openMailto(formUrl, language = 'pt', commercialName = '') {
  const t = translations[language] ?? translations.pt
  const subject = t.emailSubject
  const body = t.emailBody.replace('[EMPRESA]', commercialName).replace('[LINK]', formUrl)
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function getMinDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getDefaultExpiry() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function CreateLink() {
  const [token, setToken] = useState(null)
  const [linkLanguage, setLinkLanguage] = useState('pt')
  const [linkCommercialName, setLinkCommercialName] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [vendors, setVendors] = useState([])

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { vendor_id: '', expires_at: getDefaultExpiry(), language: 'pt' },
  })

  const minDate = getMinDate()
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const formUrl = token ? `${appUrl}/form/${token}` : null

  useEffect(() => {
    getVendors().then(setVendors).catch(() => {})
  }, [])

  useEffect(() => {
    if (vendors.length === 0) return
    try {
      const id = JSON.parse(localStorage.getItem('upflow-active-vendor'))?.id
      setValue('vendor_id', id || '')
    } catch {
      setValue('vendor_id', '')
    }
  }, [vendors])

  async function onSubmit({ vendor_id, commercial_name, expires_at, language }) {
    setSubmitError('')
    try {
      const vendor = vendors.find(v => v.id === vendor_id)
      const data = await createLink(commercial_name.trim(), expires_at, vendor_id, vendor?.name ?? '', language)
      setToken(data.token)
      setLinkLanguage(language)
      setLinkCommercialName(commercial_name.trim())
    } catch {
      setSubmitError('Erro ao criar link. Verifica a ligação e tenta novamente.')
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  function handleCreateNew() {
    setToken(null)
    setCopied(false)
    setLinkCommercialName('')
    reset()
    try {
      const id = JSON.parse(localStorage.getItem('upflow-active-vendor'))?.id
      if (id) setValue('vendor_id', id)
    } catch {}
  }

  return (
    <div className="create-link">
      <header className="create-link-header">
        <h1 className="create-link-title">Novo Link</h1>
        <p className="create-link-subtitle">Gera um link de atualização de dados para enviar ao cliente</p>
      </header>

      <div className="create-link-card">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>

          <div className="form-group">
            <label className="form-label" htmlFor="vendor_id">Vendedor</label>
            <select
              id="vendor_id"
              className={`form-input${errors.vendor_id ? ' error' : ''}`}
              {...register('vendor_id', { required: 'Campo obrigatório' })}
            >
              <option value="" disabled>Selecionar vendedor…</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.vendor_id && <p className="form-error">{errors.vendor_id.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="commercial_name">Designação Comercial</label>
            <input
              id="commercial_name"
              className={`form-input${errors.commercial_name ? ' error' : ''}`}
              type="text"
              placeholder="ex: Empresa Lda"
              {...register('commercial_name', { required: 'Campo obrigatório' })}
            />
            {errors.commercial_name && <p className="form-error">{errors.commercial_name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="language">Idioma do Formulário</label>
            <select
              id="language"
              className="form-input"
              {...register('language')}
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="expires_at">Prazo de Resposta</label>
            <input
              id="expires_at"
              className={`form-input${errors.expires_at ? ' error' : ''}`}
              type="date"
              min={minDate}
              {...register('expires_at', {
                required: 'Campo obrigatório',
                min: { value: minDate, message: 'O prazo deve ser pelo menos amanhã' },
              })}
            />
            {errors.expires_at && <p className="form-error">{errors.expires_at.message}</p>}
          </div>

          {submitError && <p className="form-error form-error--global">{submitError}</p>}

          <button type="submit" className="btn-primary btn-submit" disabled={isSubmitting || !!token}>
            {isSubmitting ? 'A criar…' : 'Gerar Link'}
          </button>
        </form>

        {formUrl && (
          <div className="link-result">
            <p className="link-result-title">Link gerado com sucesso!</p>
            <div className="link-result-url">
              <span className="link-result-text">{formUrl}</span>
              <button onClick={handleCopy} className={`btn-copy${copied ? ' copied' : ''}`}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={() => openMailto(formUrl, linkLanguage, linkCommercialName)} className="btn-copy">
                <MailIcon />
                Enviar por Email
              </button>
            </div>
            <div className="link-result-actions">
              <button onClick={handleCreateNew} className="btn-secondary">Criar Novo</button>
              <Link to="/dashboard" className="btn-primary">Ver Dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
