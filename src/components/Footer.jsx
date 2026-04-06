import React from 'react';

export default function Footer() {
  return (
    <footer className="main-footer">
      <div className="f-logo">AWDH</div>
      <div className="f-copy">© 2025 عوض · فري لانسر · جميع الحقوق محفوظة</div>
      <div className="f-loc">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        حائل، السعودية
      </div>
    </footer>
  );
}
