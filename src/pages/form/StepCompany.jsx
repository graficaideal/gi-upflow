import { useState } from 'react'
import { useForm } from 'react-hook-form'

function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export default function StepCompany({ formData, onNext }) {
  const [contactError, setContactError] = useState(null)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      company_name:  formData.company_name  ?? '',
      nif:           formData.nif           ?? '',
      morada:        formData.morada        ?? '',
      codigo_postal: formData.codigo_postal ?? '',
      localidade:    formData.localidade    ?? '',
      telefone:      formData.telefone      ?? '',
      telemovel:     formData.telemovel     ?? '',
      email:         formData.email         ?? '',
      site:          formData.site          ?? '',
    },
  })

  function onSubmit(data) {
    const hasContact = data.telefone || data.telemovel || data.email
    if (!hasContact) {
      setContactError('Indique pelo menos um meio de contacto: telefone, telemóvel ou email.')
      return
    }
    setContactError(null)
    onNext(data)
  }

  return (
    <div className="step-card">
      <h2 className="step-title">Dados da Empresa</h2>
      <p className="step-subtitle">Preencha os dados de identificação e contacto da empresa.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="fg">
          <label>Nome da Empresa *</label>
          <input
            className={errors.company_name ? 'input-error' : ''}
            {...register('company_name', { required: 'Campo obrigatório' })}
          />
          {errors.company_name && <span className="fg-error">{errors.company_name.message}</span>}
        </div>

        <div className="fg">
          <label>NIF *</label>
          <input
            className={errors.nif ? 'input-error' : ''}
            {...register('nif', {
              required: 'Campo obrigatório',
              pattern: { value: /^\d{9}$/, message: 'O NIF deve ter exactamente 9 dígitos' },
            })}
          />
          {errors.nif && <span className="fg-error">{errors.nif.message}</span>}
        </div>

        <div className="fg">
          <label>Morada *</label>
          <input
            className={errors.morada ? 'input-error' : ''}
            {...register('morada', { required: 'Campo obrigatório' })}
          />
          {errors.morada && <span className="fg-error">{errors.morada.message}</span>}
        </div>

        <div className="fg-row">
          <div className="fg">
            <label>Código Postal *</label>
            <input
              placeholder="XXXX-XXX"
              className={errors.codigo_postal ? 'input-error' : ''}
              {...register('codigo_postal', {
                required: 'Campo obrigatório',
                pattern: { value: /^\d{4}-\d{3}$/, message: 'Formato: XXXX-XXX' },
              })}
            />
            {errors.codigo_postal && <span className="fg-error">{errors.codigo_postal.message}</span>}
          </div>

          <div className="fg">
            <label>Localidade *</label>
            <input
              className={errors.localidade ? 'input-error' : ''}
              {...register('localidade', { required: 'Campo obrigatório' })}
            />
            {errors.localidade && <span className="fg-error">{errors.localidade.message}</span>}
          </div>
        </div>

        <div className="fg-row">
          <div className="fg">
            <label>Telefone</label>
            <input
              {...register('telefone')}
              onChange={e => setValue('telefone', formatPhone(e.target.value))}
              placeholder="XXX XXX XXX"
            />
          </div>
          <div className="fg">
            <label>Telemóvel</label>
            <input
              {...register('telemovel')}
              onChange={e => setValue('telemovel', formatPhone(e.target.value))}
              placeholder="XXX XXX XXX"
            />
          </div>
        </div>

        <div className="fg-row">
          <div className="fg">
            <label>Email</label>
            <input
              type="email"
              className={errors.email ? 'input-error' : ''}
              {...register('email', {
                validate: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
              })}
            />
            {errors.email && <span className="fg-error">{errors.email.message}</span>}
          </div>
          <div className="fg">
            <label>Website</label>
            <input {...register('site')} />
          </div>
        </div>

        {contactError && (
          <div className="fg-error" style={{ marginBottom: 12 }}>{contactError}</div>
        )}

        <div className="step-nav-right">
          <button type="submit" className="btn-primary">Seguinte →</button>
        </div>
      </form>
    </div>
  )
}
