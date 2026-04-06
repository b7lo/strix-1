import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const navItems = [
    { id: 'projects', label: 'الأعمال' },
    { id: 'stack', label: 'التقنيات' },
    { id: 'services', label: 'الخدمات' },
    { id: 'contact', label: 'التواصل' },
  ];

  return (
    <nav className="main-nav">
      <Link to="/" className="logo">AWD<span>H</span></Link>
      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} onClick={(e) => { e.preventDefault(); scrollTo(item.id); }}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
