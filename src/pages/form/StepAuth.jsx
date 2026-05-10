import { useState } from 'react'

const AUTH_KEYS = [
  { key: 'fotos',       tKey: 'authPhotos' },
  { key: 'videos',      tKey: 'authVideos' },
  { key: 'publicacoes', tKey: 'authPublications' },
]

export default function StepAuth({ formData, onNext, onBack, t }) {
  const [answers, setAnswers] = useState({
    fotos:       formData.fotos       ?? null,
    videos:      formData.videos      ?? null,
    publicacoes: formData.publicacoes ?? null,
  })
  const [error, setError] = useState(null)

  function select(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
    setError(null)
  }

  function handleNext() {
    const unanswered = AUTH_KEYS.filter(q => answers[q.key] === null)
    if (unanswered.length > 0) {
      setError(t.required)
      return
    }
    onNext(answers)
  }

  return (
    <div className="step-card">
      <h2 className="step-title">{t.step4Title}</h2>
      <p className="step-subtitle">{t.authIntro}</p>

      {AUTH_KEYS.map(({ key, tKey }) => (
        <div key={key} className="auth-question">
          <p className="auth-question-label">{t[tKey]}</p>
          <div className="auth-buttons">
            <button
              type="button"
              className={`auth-btn ${answers[key] === 'sim' ? 'selected-sim' : ''}`}
              onClick={() => select(key, 'sim')}
            >
              {t.yes}
            </button>
            <button
              type="button"
              className={`auth-btn ${answers[key] === 'nao' ? 'selected-nao' : ''}`}
              onClick={() => select(key, 'nao')}
            >
              {t.no}
            </button>
          </div>
        </div>
      ))}

      {error && <div className="fg-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="step-nav">
        <button type="button" className="btn-secondary" onClick={onBack}>← {t.previous}</button>
        <button type="button" className="btn-primary" onClick={handleNext}>{t.next} →</button>
      </div>
    </div>
  )
}
