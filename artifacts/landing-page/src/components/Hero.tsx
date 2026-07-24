import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import LeadCounter from './LeadCounter.tsx';
import heroShot from '../assets/screenshots/app-3.jpeg';

interface HeroProps {
  icon: string;
}

export default function Hero({ icon }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-inner">
        {/* Left: Text Content */}
        <div>
          <h1 className="hero-title reveal">
            حوّل جوالك<br />
            إلى <span className="accent">منقذ</span>
          </h1>

          <p className="hero-subtitle reveal reveal-delay-1">
            ستركس يحوّل جوالك إلى شاهد ذكي ما ينام: يمسك الحادث لحظة ما يصير، ويحلّل الموقف ويعطيك نسبة المسؤولية بدقة بين <strong>85% و90%</strong> — كل هذا بثواني.
          </p>

          <div className="hero-actions reveal reveal-delay-2">
            <a href="#join" className="btn-primary">
              سجّل مبكراً
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="#features" className="btn-ghost">
              اكتشف الميزات
            </a>
          </div>

          <LeadCounter className="hero-lead-counter reveal reveal-delay-3" />

          <div className="hero-stats reveal reveal-delay-3">
            <div>
              <div className="hero-stat-value">85–90%</div>
              <div className="hero-stat-label">دقة تحديد المسؤولية</div>
            </div>
            <div>
              <div className="hero-stat-value">16</div>
              <div className="hero-stat-label">منطقة رصد بالمركبة</div>
            </div>
          </div>
        </div>

        {/* Right: Phone Mockup */}
        <div className="phone-wrap reveal reveal-delay-2" style={{ position: 'relative' }}>
          <div className="phone-glow" />

          {/* Floating Elements */}
          <div className="floating-card right">
            <div className="floating-card-icon">
              <FileText size={20} />
            </div>
            <div className="floating-card-text">
              <div className="floating-card-title">تقرير الحادث.pdf</div>
              <div className="floating-card-subtitle">جاهز للمشاركة</div>
            </div>
          </div>

          <div className="floating-card left">
            <div className="floating-card-icon red">
              <AlertTriangle size={20} />
            </div>
            <div className="floating-card-text">
              <div className="floating-card-title">رصد تصادم قوي</div>
              <div className="floating-card-subtitle">يتم الآن التحليل...</div>
            </div>
          </div>

          <div className="phone phone-shot">
            <img src={heroShot} alt="لقطة من تطبيق ستركس" />
          </div>
        </div>
      </div>
    </section>
  );
}
