import { useState } from 'react'
import './DeleteLinkModal.css'

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function DeleteLinkModal({ link, onConfirm, onClose }) {
  const [code] = useState(generateCode)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm(link.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Apagar link</h2>
        <div className="modal-link-info">
          <p className="modal-client">{link.commercial_name}</p>
        </div>
        <p className="modal-warning">Esta ação é irreversível</p>
        <p className="modal-code-label">Para confirmar, introduz o código:</p>
        <p className="modal-code">{code}</p>
        <input
          className="modal-input"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={input}
          autoFocus
          placeholder="····"
          onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="btn-danger"
            type="button"
            disabled={input !== code || loading}
            onClick={handleConfirm}
          >
            {loading ? 'A apagar…' : 'Apagar'}
          </button>
        </div>
      </div>
    </div>
  )
}
