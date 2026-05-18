import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatPhone } from '../../utils/phone'

const DEPT_KEYS = ['compras', 'financeiro', 'marketing']

const CARGO_OPTIONS = {
  pt: ['Administrador', 'Diretor', 'Responsável', 'Técnico'],
  en: ['Administrator', 'Director', 'Manager', 'Technician'],
  es: ['Administrador', 'Director', 'Responsable', 'Técnico'],
}

const OUTRO_LABEL = { pt: 'Outro', en: 'Other', es: 'Otro' }

export default function StepContacts({ formData, onNext, onBack, t, language }) {
  const isPT = language === 'pt'
  const deptLabels = {
    compras:    t.deptCompras,
    financeiro: t.deptFinanceiro,
    marketing:  t.deptMarketing,
  }
  const cargoOpts = CARGO_OPTIONS[language] ?? CARGO_OPTIONS.pt
  const outroLabel = OUTRO_LABEL[language] ?? 'Outro'

  const [crossErrors, setCrossErrors] = useState({})
  const [billingSameEmail, setBillingSameEmail] = useState(formData.billing_same_email ?? null)
  const [billingMode, setBillingMode] = useState(formData.billing_mode ?? null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      ...Object.fromEntries(
        DEPT_KEYS.flatMap(key => [
          [`${key}_nome`,        formData[`${key}_nome`]        ?? ''],
          [`${key}_email`,       formData[`${key}_email`]       ?? ''],
          [`${key}_telefone`,    formData[`${key}_telefone`]    ?? ''],
          [`${key}_telemovel`,   formData[`${key}_telemovel`]   ?? ''],
          [`${key}_cargo`,       formData[`${key}_cargo`]       ?? ''],
          [`${key}_cargo_outro`, formData[`${key}_cargo_outro`] ?? ''],
        ])
      ),
      billing_email: formData.billing_email ?? '',
      billing_notes: formData.billing_notes ?? '',
    },
  })

  function onSubmit(data) {
    const newErrors = {}

    DEPT_KEYS.forEach(key => {
      const nome = data[`${key}_nome`]?.trim()
      const tel  = data[`${key}_telefone`]?.trim()
      const mob  = data[`${key}_telemovel`]?.trim()

      if (!nome)       newErrors[`${key}_nome`]    = t.required
      if (!tel && !mob) newErrors[`${key}_contact`] = t.atLeastOneContact
      if (data[`${key}_cargo`] === 'outro' && !data[`${key}_cargo_outro`]?.trim()) {
        newErrors[`${key}_cargo_outro`] = t.required
      }
    })

    if (billingSameEmail === null) newErrors['billing_same_email'] = t.required
    if (!billingMode)              newErrors['billing_mode']        = t.required
    if (billingSameEmail === false) {
      const email = data.billing_email?.trim()
      if (!email) {
        newErrors['billing_email'] = t.required
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors['billing_email'] = 'Email inválido'
      }
    }

    setCrossErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    onNext({
      ...data,
      billing_same_email: billingSameEmail,
      billing_email: billingSameEmail ? null : (data.billing_email || null),
      billing_mode:  billingMode,
      billing_notes: data.billing_notes || null,
    })
  }

  return (
    <div className="step-card">
      <h2 className="step-title">{t.step2Title}</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {DEPT_KEYS.map(key => (
          <div key={key} className="dept-section">
            <p className="dept-title">{deptLabels[key]}</p>

            <div className="fg">
              <label>{t.name} *</label>
              <input
                className={crossErrors[`${key}_nome`] ? 'input-error' : ''}
                {...register(`${key}_nome`)}
              />
              {crossErrors[`${key}_nome`] && (
                <span className="fg-error">{crossErrors[`${key}_nome`]}</span>
              )}
            </div>

            <div className="fg">
              <label>{t.cargo}</label>
              <select {...register(`${key}_cargo`)}>
                <option value="">— —</option>
                {cargoOpts.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="outro">{outroLabel}</option>
              </select>
            </div>

            {watch(`${key}_cargo`) === 'outro' && (
              <div className="fg">
                <label>{t.cargoOther} *</label>
                <input
                  className={crossErrors[`${key}_cargo_outro`] ? 'input-error' : ''}
                  {...register(`${key}_cargo_outro`)}
                />
                {crossErrors[`${key}_cargo_outro`] && (
                  <span className="fg-error">{crossErrors[`${key}_cargo_outro`]}</span>
                )}
              </div>
            )}

            <div className="fg">
              <label>{t.contactEmail} *</label>
              <input
                type="email"
                className={errors[`${key}_email`] ? 'input-error' : ''}
                {...register(`${key}_email`, {
                  required: t.required,
                  validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
                })}
              />
              {errors[`${key}_email`] && (
                <span className="fg-error">{errors[`${key}_email`].message}</span>
              )}
            </div>

            <div className="fg-row">
              <div className="fg">
                <label>{t.contactPhone}</label>
                <input
                  placeholder={isPT ? 'XXX XXX XXX' : ''}
                  {...register(`${key}_telefone`)}
                  onChange={isPT ? e => setValue(`${key}_telefone`, formatPhone(e.target.value)) : undefined}
                />
              </div>
              <div className="fg">
                <label>{t.contactMobile}</label>
                <input
                  placeholder={isPT ? 'XXX XXX XXX' : ''}
                  {...register(`${key}_telemovel`)}
                  onChange={isPT ? e => setValue(`${key}_telemovel`, formatPhone(e.target.value)) : undefined}
                />
              </div>
            </div>

            {crossErrors[`${key}_contact`] && (
              <span className="fg-error">{crossErrors[`${key}_contact`]}</span>
            )}

            {key === 'financeiro' && (
              <div className="billing-section">
                <p className="billing-section-title">{t.billingMode}</p>

                <div className="fg">
                  <label>{t.billingQuestion}</label>
                  <div className="auth-buttons">
                    <button
                      type="button"
                      className={`auth-btn ${billingSameEmail === true ? 'selected-sim' : ''}`}
                      onClick={() => setBillingSameEmail(true)}
                    >
                      {t.yes}
                    </button>
                    <button
                      type="button"
                      className={`auth-btn ${billingSameEmail === false ? 'selected-nao' : ''}`}
                      onClick={() => setBillingSameEmail(false)}
                    >
                      {t.no}
                    </button>
                  </div>
                  {crossErrors['billing_same_email'] && (
                    <span className="fg-error">{crossErrors['billing_same_email']}</span>
                  )}
                </div>

                {billingSameEmail === false && (
                  <div className="fg">
                    <label>{t.billingEmail} *</label>
                    <input
                      type="email"
                      className={crossErrors['billing_email'] ? 'input-error' : ''}
                      {...register('billing_email')}
                    />
                    {crossErrors['billing_email'] && (
                      <span className="fg-error">{crossErrors['billing_email']}</span>
                    )}
                  </div>
                )}

                <div className="fg">
                  <label>{t.billingMode} *</label>
                  <div className="auth-buttons">
                    <button
                      type="button"
                      className={`auth-btn ${billingMode === 'eletronico' ? 'selected-sim' : ''}`}
                      onClick={() => setBillingMode('eletronico')}
                    >
                      {t.billingModeElectronic}
                    </button>
                    <button
                      type="button"
                      className={`auth-btn ${billingMode === 'papel' ? 'selected-sim' : ''}`}
                      onClick={() => setBillingMode('papel')}
                    >
                      {t.billingModePaper}
                    </button>
                  </div>
                  {crossErrors['billing_mode'] && (
                    <span className="fg-error">{crossErrors['billing_mode']}</span>
                  )}
                </div>

                <div className="fg">
                  <label>{t.billingNotes}</label>
                  <textarea
                    {...register('billing_notes')}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="step-nav">
          <button type="button" className="btn-secondary" onClick={onBack}>← {t.previous}</button>
          <button type="submit" className="btn-primary">{t.next} →</button>
        </div>
      </form>
    </div>
  )
}
