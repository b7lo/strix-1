import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = login(password);
    if (result.success) {
      navigate('/access/v2/dashboard');
    } else {
      setError(result.message || 'كلمة المرور غير صحيحة');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem', position: 'relative'
    }}>
      <div className="orb orb1" style={{ width: '400px', height: '400px', opacity: 0.1 }}></div>
      <div style={{
        width: '100%', maxWidth: '380px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '12px', padding: '2.5rem',
        zIndex: 2, position: 'relative'
      }}>
        <div style={{
          fontFamily: '"Space Mono", monospace', color: 'var(--accent)',
          fontSize: '0.75rem', letterSpacing: '4px', textAlign: 'center', marginBottom: '1.2rem'
        }}>
          // ACCESS CONSOLE
        </div>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>بوابة الوصول</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="fg" style={{ marginBottom: '1.5rem' }}>
            <label>رمز الدخول</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
          <button className="ct-btn" style={{ width: '100%' }}>دخول إلى النظام</button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>العودة للرئيسية</a>
        </div>
      </div>
    </div>
  );
}
