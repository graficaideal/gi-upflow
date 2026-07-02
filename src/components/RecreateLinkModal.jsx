import './DeleteLinkModal.css'

export default function RecreateLinkModal({ link, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Criar novo link?</h2>
        <div className="modal-link-info">
          <p className="modal-client">{link.commercial_name}</p>
        </div>
        <p className="modal-code-label">Pretende criar um novo link para esta entidade?</p>
        <div className="modal-actions">
          <button className="btn-secondary" type="button" onClick={onClose}>
            Não, obrigado
          </button>
          <button className="btn-primary" type="button" onClick={onConfirm}>
            Sim, criar novo
          </button>
        </div>
      </div>
    </div>
  )
}
