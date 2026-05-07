import { useState } from 'react'
import { useForm } from 'react-hook-form'

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

const DEPARTMENTS = [
  { key: 'compras',    label: 'Compras' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'marketing',  label: 'Marketing' },
]

export default function StepContacts({ formData, onNext, onBack }) {
  const [crossErrors, setCrossErrors] = useState({})

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: Object.fromEntries(
      DEPARTMENTS.flatMap(({ key }) => [
        [`${key}_nome`,      formData[`${key}_nome`]      ?? ''],
        [`${key}_email`,     formData[`${key}_email`]     ?? ''],
        [`${key}_telefone`,  formData[`${key}_telefone`]  ?? ''],
        [`${key}_telemovel`, formData[`${key}_telemovel`] ?? ''],
      ])
    ),
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

    setCrossErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    onNext(data)
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
