import { useState } from 'react'

export default function StepRGPD({ onBack, onSubmit, submitting, t }) {
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(null)

  function handleSubmit() {
    if (!accepted) {
      setError(t.required)
      return
    }
    setError(null)
    onSubmit({ rgpd_accepted: true })
  }

  return (
    <div className="step-card">
      <h2 className="step-title">{t.step3Title}</h2>

      <div className="rgpd-text">
        <p>{t.rgpdText}</p>
      </div>

      <div className="rgpd-checkbox-row">
        <input
          type="checkbox"
          id="rgpd-accept"
          checked={accepted}
          onChange={e => { setAccepted(e.target.checked); setError(null) }}
        />
        <label htmlFor="rgpd-accept">{t.rgpdAccept}</label>
      </div>

      {error && <div className="fg-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="step-nav">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={submitting}>
          ← {t.previous}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '…' : t.submit}
        </button>
      </div>
    </div>
  )
}
