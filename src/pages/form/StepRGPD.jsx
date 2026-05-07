import { useState } from 'react'

const RGPD_TEXT = `A Gráfica Ideal, Lda. é responsável pelo tratamento dos dados pessoais que nos fornece através deste formulário.

Os dados recolhidos destinam-se a: (i) gestão da relação comercial; (ii) envio de comunicações comerciais e promocionais; (iii) cumprimento de obrigações legais.

Os seus dados serão conservados durante o período necessário ao cumprimento das finalidades para que foram recolhidos, salvo obrigação legal de conservação por prazo superior.

Tem o direito de aceder, retificar, apagar, limitar ou opor-se ao tratamento dos seus dados, bem como o direito à portabilidade, nos termos previstos no Regulamento Geral sobre a Proteção de Dados (RGPD).

Para exercer esses direitos ou obter mais informações, contacte-nos através do endereço: geral@graficaideal.pt

Pode apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD) em www.cnpd.pt.`

export default function StepRGPD({ onBack, onSubmit, submitting }) {
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState(null)

  function handleSubmit() {
    if (!accepted) {
      setError('Deve aceitar a política de privacidade para continuar.')
      return
    }
    setError(null)
    onSubmit({ rgpd_accepted: true })
  }

  return (
    <div className="step-card">
      <h2 className="step-title">Política de Privacidade (RGPD)</h2>
      <p className="step-subtitle">Leia e aceite os termos antes de submeter o formulário.</p>

      <div className="rgpd-text">
        {RGPD_TEXT.split('\n\n').map((para, i) => (
          <p key={i} style={{ marginBottom: i < RGPD_TEXT.split('\n\n').length - 1 ? 12 : 0 }}>{para}</p>
        ))}
      </div>

      <div className="rgpd-checkbox-row">
        <input
          type="checkbox"
          id="rgpd-accept"
          checked={accepted}
          onChange={e => { setAccepted(e.target.checked); setError(null) }}
        />
        <label htmlFor="rgpd-accept">
          Li e aceito a política de privacidade e o tratamento dos meus dados pessoais pela Gráfica Ideal, Lda.
        </label>
      </div>

      {error && <div className="fg-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="step-nav">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={submitting}>
          ← Anterior
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'A submeter…' : 'Submeter'}
        </button>
      </div>
    </div>
  )
}
