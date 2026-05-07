import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatPhone } from '../../utils/phone'

const DEPARTMENTS = [
  { key: 'compras',    label: 'Compras' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'marketing',  label: 'Marketing' },
]

export default function StepContacts({ formData, onNext, onBack }) {
  const [crossErrors, setCrossErrors] = useState({})
  const [billingSameEmail, setBillingSameEmail] = useState(
    formData.billing_same_email ?? null
  )
  const [billingMode, setBillingMode] = useState(
    formData.billing_mode ?? null
  )

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      ...Object.fromEntries(
        DEPARTMENTS.flatMap(({ key }) => [
          [`${key}_nome`,      formData[`${key}_nome`]      ?? ''],
          [`${key}_email`,     formData[`${key}_email`]     ?? ''],
          [`${key}_telefone`,  formData[`${key}_telefone`]  ?? ''],
          [`${key}_telemovel`, formData[`${key}_telemovel`] ?? ''],
        ])
      ),
      billing_email: formData.billing_email ?? '',
      billing_notes: formData.billing_notes ?? '',
    },
  })

  function onSubmit(data) {
    const newErrors = {}

    DEPARTMENTS.forEach(({ key }) => {
      const nome = data[`${key}_nome`]?.trim()
      const tel  = data[`${key}_telefone`]?.trim()
      const mob  = data[`${key}_telemovel`]?.trim()

      if (!nome) {
        newErrors[`${key}_nome`] = 'Campo obrigatório'
      }
      if (!tel && !mob) {
        newErrors[`${key}_contact`] = 'Indique pelo menos um número de telefone ou telemóvel'
      }
    })

    if (billingSameEmail === null) {
      newErrors['billing_same_email'] = 'Por favor indique se utiliza o mesmo email de faturação'
    }
    if (!billingMode) {
      newErrors['billing_mode'] = 'Por favor selecione o modo de envio de faturas'
    }
    if (billingSameEmail === false) {
      const email = data.billing_email?.trim()
      if (!email) {
        newErrors['billing_email'] = 'Campo obrigatório'
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
      <h2 className="step-title">Contactos por Departamento</h2>
      <p className="step-subtitle">Preencha os contactos dos três departamentos. Para cada um, indique pelo menos um número de telefone ou telemóvel.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {DEPARTMENTS.map(({ key, label }) => (
          <div key={key} className="dept-section">
            <p className="dept-title">{label}</p>

            <div className="fg">
              <label>Nome *</label>
              <input
                className={crossErrors[`${key}_nome`] ? 'input-error' : ''}
                {...register(`${key}_nome`)}
              />
              {crossErrors[`${key}_nome`] && (
                <span className="fg-error">{crossErrors[`${key}_nome`]}</span>
              )}
            </div>

            <div className="fg">
              <label>Email *</label>
              <input
                type="email"
                className={errors[`${key}_email`] ? 'input-error' : ''}
                {...register(`${key}_email`, {
                  required: 'Campo obrigatório',
                  validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
                })}
              />
              {errors[`${key}_email`] && (
                <span className="fg-error">{errors[`${key}_email`].message}</span>
              )}
            </div>

            <div className="fg-row">
              <div className="fg">
                <label>Telefone</label>
                <input
                  {...register(`${key}_telefone`)}
                  onChange={e => setValue(`${key}_telefone`, formatPhone(e.target.value))}
                  placeholder="XXX XXX XXX"
                />
              </div>
              <div className="fg">
                <label>Telemóvel</label>
                <input
                  {...register(`${key}_telemovel`)}
                  onChange={e => setValue(`${key}_telemovel`, formatPhone(e.target.value))}
                  placeholder="XXX XXX XXX"
                />
              </div>
            </div>

            {crossErrors[`${key}_contact`] && (
              <span className="fg-error">{crossErrors[`${key}_contact`]}</span>
            )}

            {key === 'financeiro' && (
              <div className="billing-section">
                <p className="billing-section-title">Faturação</p>

                <div className="fg">
                  <label>Utiliza o mesmo email do Dep. Financeiro?</label>
                  <div className="auth-buttons">
                    <button
                      type="button"
                      className={`auth-btn ${billingSameEmail === true ? 'selected-sim' : ''}`}
                      onClick={() => setBillingSameEmail(true)}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      className={`auth-btn ${billingSameEmail === false ? 'selected-nao' : ''}`}
                      onClick={() => setBillingSameEmail(false)}
                    >
                      Não
                    </button>
                  </div>
                  {crossErrors['billing_same_email'] && (
                    <span className="fg-error">{crossErrors['billing_same_email']}</span>
                  )}
                </div>

                {billingSameEmail === false && (
                  <div className="fg">
                    <label>Email de faturação *</label>
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
                  <label>Modo de envio de faturas *</label>
                  <div className="auth-buttons">
                    <button
                      type="button"
                      className={`auth-btn ${billingMode === 'eletronico' ? 'selected-sim' : ''}`}
                      onClick={() => setBillingMode('eletronico')}
                    >
                      Eletrónico
                    </button>
                    <button
                      type="button"
                      className={`auth-btn ${billingMode === 'papel' ? 'selected-sim' : ''}`}
                      onClick={() => setBillingMode('papel')}
                    >
                      Papel
                    </button>
                  </div>
                  {crossErrors['billing_mode'] && (
                    <span className="fg-error">{crossErrors['billing_mode']}</span>
                  )}
                </div>

                <div className="fg">
                  <label>Notas de faturação</label>
                  <textarea
                    {...register('billing_notes')}
                    rows={3}
                    placeholder="Observações opcionais…"
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="step-nav">
          <button type="button" className="btn-secondary" onClick={onBack}>← Anterior</button>
          <button type="submit" className="btn-primary">Seguinte →</button>
        </div>
      </form>
    </div>
  )
}
