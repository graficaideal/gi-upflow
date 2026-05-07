import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getLinkByToken, markOpened } from '../../hooks/useLinks'
import { submitForm } from '../../hooks/useSubmission'
import StepCompany from './StepCompany'
import StepContacts from './StepContacts'
import StepAuth from './StepAuth'
import StepRGPD from './StepRGPD'
import FormSuccess from './FormSuccess'
import './FormPage.css'

const STEPS = ['Empresa', 'Contactos', 'Autorizações', 'RGPD']

export default function FormPage() {
  const { token } = useParams()
  const [link, setLink] = useState(null)
  const [status, setStatus] = useState('loading') // loading | invalid | expired | completed | active | done
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    getLinkByToken(token)
      .then(data => {
        setLink(data)
        if (data.status === 'completed') { setStatus('completed'); return }
        if (data.status === 'expired')   { setStatus('expired');   return }
        const today = new Date().toISOString().split('T')[0]
        if (data.expires_at < today)     { setStatus('expired');   return }
        setStatus('active')
        if (data.status === 'pending') markOpened(token).catch(() => {})
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  function next(data) {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(s => s + 1)
  }

  function back() {
    setStep(s => s - 1)
  }

  async function handleSubmit(rgpdData) {
    const finalData = { ...formData, ...rgpdData }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitForm(token, finalData)
      setStatus('done')
    } catch (err) {
      setSubmitError(err.message ?? 'Ocorreu um erro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="form-page form-page--center">
        <div className="form-spinner" />
      </div>
    )
  }

  if (status === 'done') return <FormSuccess />

  if (status === 'invalid') {
    return (
      <div className="form-page form-page--center">
        <div className="form-message-card">
          <div className="form-message-icon">🔗</div>
          <h2>Link inválido</h2>
          <p>Este link de preenchimento não existe ou é inválido.</p>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="form-page form-page--center">
        <div className="form-message-card">
          <div className="form-message-icon">⏰</div>
          <h2>Link expirado</h2>
          <p>O prazo para preencher este formulário já terminou.</p>
        </div>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="form-page form-page--center">
        <div className="form-message-card">
          <div className="form-message-icon">✅</div>
          <h2>Formulário já submetido</h2>
          <p>Os seus dados já foram enviados com sucesso. Obrigado!</p>
        </div>
      </div>
    )
  }

  const stepProps = { formData, onNext: next, onBack: back }

  return (
    <div className="form-page">
      <header className="form-header">
        <img src="/logo.svg" alt="Gráfica Ideal" className="form-logo-img" />
        <p className="form-client-name">{link?.client_name}</p>
      </header>

      <div className="form-progress-wrap">
        <div className="form-progress">
          {STEPS.map((label, i) => (
            <div key={i} className={`form-step-dot ${i < step ? 'dot-done' : ''} ${i === step ? 'dot-active' : ''}`}>
              <div className="dot-circle">{i < step ? '✓' : i + 1}</div>
              <span className="dot-label">{label}</span>
            </div>
          ))}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="form-body">
        {submitError && <div className="form-submit-error">{submitError}</div>}
        {step === 0 && <StepCompany {...stepProps} companyName={link?.company_name} />}
        {step === 1 && <StepContacts {...stepProps} />}
        {step === 2 && <StepAuth {...stepProps} />}
        {step === 3 && <StepRGPD {...stepProps} onSubmit={handleSubmit} submitting={submitting} />}

        <div className="form-pdf-link-wrap">
          <a href="/gi-ficha.pdf" download target="_blank" rel="noopener noreferrer" className="form-pdf-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descarregar Ficha da Gráfica Ideal
          </a>
        </div>
      </div>
    </div>
  )
}
