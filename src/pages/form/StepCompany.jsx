import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { formatPhone } from '../../utils/phone'
import { formatNif, validateNIF } from '../../utils/nif'
import { formatPostalCode } from '../../utils/postalCode'

export default function StepCompany({ formData, onNext, t, language }) {
  const [contactError, setContactError] = useState(null)
  const isPT = language === 'pt'

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
      setContactError(t.atLeastOneContact)
      return
    }
    setContactError(null)
    onNext(data)
  }

  return (
    <div className="step-card">
      <h2 className="step-title">{t.step1Title}</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="fg">
          <label>{t.fiscalName} *</label>
          <input
            className={errors.fiscal_name ? 'input-error' : ''}
            {...register('fiscal_name', { required: t.required })}
          />
          {errors.fiscal_name && <span className="fg-error">{errors.fiscal_name.message}</span>}
        </div>

        <div className="fg">
          <label>{t.nif} *</label>
          <input
            className={errors.nif ? 'input-error' : ''}
            {...register('nif', {
              required: t.required,
              ...(isPT && {
                validate: v => validateNIF(v) || 'NIF inválido',
              }),
            })}
            onChange={isPT ? e => setValue('nif', formatNif(e.target.value)) : undefined}
          />
          {errors.nif && <span className="fg-error">{errors.nif.message}</span>}
        </div>

        <div className="fg">
          <label>{t.address} *</label>
          <input
            className={errors.morada ? 'input-error' : ''}
            {...register('morada', { required: t.required })}
          />
          {errors.morada && <span className="fg-error">{errors.morada.message}</span>}
        </div>

        <div className="fg-row">
          <div className="fg">
            <label>{t.postalCode} *</label>
            <input
              placeholder={isPT ? 'XXXX-XXX' : ''}
              className={errors.codigo_postal ? 'input-error' : ''}
              {...register('codigo_postal', {
                required: t.required,
                ...(isPT && {
                  pattern: { value: /^\d{4}-\d{3}$/, message: 'Formato: XXXX-XXX' },
                }),
              })}
              onChange={isPT ? e => setValue('codigo_postal', formatPostalCode(e.target.value)) : undefined}
            />
            {errors.codigo_postal && <span className="fg-error">{errors.codigo_postal.message}</span>}
          </div>

          <div className="fg">
            <label>{t.city} *</label>
            <input
              className={errors.localidade ? 'input-error' : ''}
              {...register('localidade', { required: t.required })}
            />
            {errors.localidade && <span className="fg-error">{errors.localidade.message}</span>}
          </div>
        </div>

        <div className="fg-row">
          <div className="fg">
            <label>{t.phone}</label>
            <input
              className={contactError ? 'input-error' : ''}
              placeholder={isPT ? 'XXX XXX XXX' : ''}
              {...register('telefone')}
              onChange={isPT ? e => setValue('telefone', formatPhone(e.target.value)) : undefined}
            />
          </div>
          <div className="fg">
            <label>{t.mobile}</label>
            <input
              className={contactError ? 'input-error' : ''}
              placeholder={isPT ? 'XXX XXX XXX' : ''}
              {...register('telemovel')}
              onChange={isPT ? e => setValue('telemovel', formatPhone(e.target.value)) : undefined}
            />
          </div>
        </div>
        {contactError && <span className="fg-error">{contactError}</span>}

        <div className="fg-row">
          <div className="fg">
            <label>{t.email} *</label>
            <input
              type="email"
              className={errors.email ? 'input-error' : ''}
              {...register('email', {
                required: t.required,
                validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
              })}
            />
            {errors.email && <span className="fg-error">{errors.email.message}</span>}
          </div>
          <div className="fg">
            <label>{t.website}</label>
            <input {...register('site')} />
          </div>
        </div>

        <div className="step-nav-right">
          <button type="submit" className="btn-primary">{t.next} →</button>
        </div>
      </form>
    </div>
  )
}
