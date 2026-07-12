import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import strixIcon from './assets/icon.png';
import Hero from './components/Hero.tsx';
import BrandStory from './components/BrandStory.tsx';
import Features from './components/Features.tsx';
import Showcase from './components/Showcase.tsx';
import HowItWorks from './components/HowItWorks.tsx';
import LeadForm from './components/LeadForm.tsx';
import { Moon, Sun } from 'lucide-react';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  return (
    <header className="navbar" style={{ boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.1)' : 'none' }}>
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <img src={strixIcon} alt="Strix Logo" />
          </div>
          <span className="navbar-name">Strix</span>
        </div>

        <nav className="navbar-nav">
          <a href="#story">قصتنا</a>
          <a href="#features">الميزات</a>
          <a href="#showcase">التطبيق</a>
          <a href="#how-it-works">كيف يعمل</a>
          <a href="#join">سجل الآن</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={toggleTheme} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="تبديل المظهر"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <a href="#join" className="btn-cta-sm">التسجيل المبكر</a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-top">
          <div>
            <div className="footer-brand">
              <img src={strixIcon} alt="Strix" />
              <span className="footer-brand-name">Strix</span>
            </div>
            <p className="footer-tagline">حوّل سيارتك إلى منقذ</p>
          </div>

          <div className="footer-links">
            <div className="footer-link-group">
              <h4>التطبيق</h4>
              <ul>
                <li><a href="#features">الميزات</a></li>
                <li><a href="#how-it-works">كيف يعمل</a></li>
                <li><a href="#join">المستخدمون الأوائل</a></li>
              </ul>
            </div>
            <div className="footer-link-group">
              <h4>تواصل</h4>
              <ul>
                <li><a href="#">سياسة الخصوصية</a></li>
                <li><a href="#">الشروط والأحكام</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Strix. جميع الحقوق محفوظة.</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-mesh">
      <Navbar />
      <main>
        <Hero icon={strixIcon} />
        <BrandStory />
        <Features />
        <Showcase />
        <HowItWorks />
        <LeadForm icon={strixIcon} />
      </main>
      <Footer />
    </div>
  );
}
