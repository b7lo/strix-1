import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 2, borderTop: '1px solid var(--border)',
      padding: '2.2rem 4rem', display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', color: 'var(--muted)', fontSize: '0.83rem'
    }}>
      <div className="f-logo" style={{ fontFamily: '"Space Mono", monospace', color: 'var(--accent)', fontSize: '0.95rem', letterSpacing: '4px' }}>AWDH</div>
      <div>© 2025 عوض · فري لانسر · جميع الحقوق محفوظة</div>
      <div className="f-loc" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent)', fontFamily: '"Space Mono", monospace', fontSize: '0.72rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px' }}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        حائل، السعودية
      </div>
    </footer>
  );
}
