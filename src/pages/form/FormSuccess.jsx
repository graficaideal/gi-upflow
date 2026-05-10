export default function FormSuccess({ t }) {
  return (
    <div className="form-page form-page--center" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="form-message-card">
        <div className="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
        </div>
        <h2>{t.successTitle}</h2>
        <p>{t.successText}</p>

        <a
          href="/gi-ficha.pdf"
          download
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            padding: '12px 24px',
            background: '#e0cb4b',
            color: '#333F48',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '14px',
            textDecoration: 'none',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {t.downloadPdf}
        </a>
      </div>
    </div>
  )
}
