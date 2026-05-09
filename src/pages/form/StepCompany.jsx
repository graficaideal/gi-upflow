import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatPhone } from '../../utils/phone'
import { formatNif } from '../../utils/nif'
import { formatPostalCode } from '../../utils/postalCode'

export default function StepCompany({ formData, onNext }) {
  const [contactError, setContactError] = useState(null)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      fiscal_name:   formData.fiscal_name   ?? '',
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
    if (!data.telefone && !data.telemovel) {
      setContactError('Introduz pelo menos um número de contacto')
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
          <label>Designação Fiscal *</label>
          <input
            className={errors.fiscal_name ? 'input-error' : ''}
            {...register('fiscal_name', { required: 'Campo obrigatório' })}
          />
          {errors.fiscal_name && <span className="fg-error">{errors.fiscal_name.message}</span>}
        </div>

        <div className="fg">
          <label>NIF *</label>
          <input
            className={errors.nif ? 'input-error' : ''}
            {...register('nif', {
              required: 'Campo obrigatório',
              validate: v => v.replace(/\s/g, '').length === 9 || 'O NIF deve ter exactamente 9 dígitos',
            })}
            onChange={e => setValue('nif', formatNif(e.target.value))}
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
              onChange={e => setValue('codigo_postal', formatPostalCode(e.target.value))}
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
              className={contactError ? 'input-error' : ''}
              {...register('telefone')}
              onChange={e => setValue('telefone', formatPhone(e.target.value))}
              placeholder="XXX XXX XXX"
            />
          </div>
          <div className="fg">
            <label>Telemóvel</label>
            <input
              className={contactError ? 'input-error' : ''}
              {...register('telemovel')}
              onChange={e => setValue('telemovel', formatPhone(e.target.value))}
              placeholder="XXX XXX XXX"
            />
          </div>
        </div>
        {contactError && <span className="fg-error">{contactError}</span>}

        <div className="fg-row">
          <div className="fg">
            <label>Email *</label>
            <input
              type="email"
              className={errors.email ? 'input-error' : ''}
              {...register('email', {
                required: 'O email é obrigatório',
                validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
              })}
            />
            {errors.email && <span className="fg-error">{errors.email.message}</span>}
          </div>
          <div className="fg">
            <label>Website</label>
            <input {...register('site')} />
          </div>
        </div>

        <div className="step-nav-right">
          <button type="submit" className="btn-primary">Seguinte →</button>
        </div>
      </form>
    </div>
  )
}
