import { useState } from 'react'

const QUESTIONS = [
  { key: 'fotos',      label: 'Autoriza a utilização de fotografias da vossa empresa em materiais promocionais?' },
  { key: 'videos',     label: 'Autoriza a utilização de vídeos da vossa empresa em materiais promocionais?' },
  { key: 'publicacoes', label: 'Autoriza a publicação de conteúdos relacionados com a vossa empresa nas redes sociais da Gráfica Ideal?' },
]

export default function StepAuth({ formData, onNext, onBack }) {
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
    const unanswered = QUESTIONS.filter(q => answers[q.key] === null)
    if (unanswered.length > 0) {
      setError('Por favor responda a todas as questões antes de continuar.')
      return
    }
    onNext(answers)
  }

  return (
    <div className="step-card">
      <h2 className="step-title">Autorizações de Comunicação</h2>
      <p className="step-subtitle">Indique se autoriza a utilização dos seguintes conteúdos por parte da Gráfica Ideal.</p>

      {QUESTIONS.map(({ key, label }) => (
        <div key={key} className="auth-question">
          <p className="auth-question-label">{label}</p>
          <div className="auth-buttons">
            <button
              type="button"
              className={`auth-btn ${answers[key] === 'sim' ? 'selected-sim' : ''}`}
              onClick={() => select(key, 'sim')}
            >
              Sim
            </button>
            <button
              type="button"
              className={`auth-btn ${answers[key] === 'nao' ? 'selected-nao' : ''}`}
              onClick={() => select(key, 'nao')}
            >
              Não
            </button>
          </div>
        </div>
      ))}

      {error && <div className="fg-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="step-nav">
        <button type="button" className="btn-secondary" onClick={onBack}>← Anterior</button>
        <button type="button" className="btn-primary" onClick={handleNext}>Seguinte →</button>
      </div>
    </div>
  )
}
