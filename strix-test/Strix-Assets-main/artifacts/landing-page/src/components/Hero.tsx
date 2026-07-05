import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import LeadCounter from './LeadCounter.tsx';

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
            حوّل سيارتك<br />
            إلى <span className="accent">منقذ</span>
          </h1>

          <p className="hero-subtitle reveal reveal-delay-1">
            ستركس يحوّل هاتفك إلى نظام ذكي لرصد الحوادث آلياً وتوثيقها بدقة عالية باستخدام المستشعرات، لتوثيق وقائع الحادث بثقة وشفافية.
          </p>

          <div className="hero-actions reveal reveal-delay-2">
            <a href="#join" className="btn-primary">
              سجّل مبكراً — مجاناً
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
              <div className="hero-stat-value">90%</div>
              <div className="hero-stat-label">دقة رصد نقطة التصادم</div>
            </div>
            <div>
              <div className="hero-stat-value">10s</div>
              <div className="hero-stat-label">تحليل ما قبل الاصطدام</div>
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

          <div className="phone">
            <div className="phone-notch">
              <div className="phone-notch-pill" />
            </div>

            <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <img src={icon} alt="Strix" style={{ width: 22, height: 22, borderRadius: 6 }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--strix-green)' }}>Strix</span>
            </div>

            <div className="phone-content">
              {/* Alert */}
              <div className="phone-card phone-card-alert">
                <div className="phone-alert-icon">🚨</div>
                <div>
                  <div className="phone-alert-title">تم رصد اصطدام قوي</div>
                  <div className="phone-alert-sub">جاري تحليل البيانات...</div>
                </div>
              </div>

              {/* Car diagram */}
              <div className="phone-card" style={{ padding: '0.75rem' }}>
                <div className="phone-zone-label">منطقة الاصطدام: أمام يسار</div>
                <div className="phone-car-diagram">
                  <div className="car-icon">🚗</div>
                  <div className="impact-dot" />
                </div>
              </div>

              {/* Stats */}
              <div className="phone-card" style={{ padding: '0.75rem' }}>
                <div className="phone-stat-row">
                  <span className="phone-stat-key">السرعة</span>
                  <span className="phone-stat-val">85 km/h</span>
                </div>
                <div className="phone-stat-row">
                  <span className="phone-stat-key">قوة الاصطدام</span>
                  <span className="phone-stat-val">4.2g</span>
                </div>
                <div className="phone-stat-row">
                  <span className="phone-stat-key">الفرملة قبل</span>
                  <span className="phone-stat-val ok">✓ مُسجّلة</span>
                </div>
              </div>

              <button className="phone-btn">إصدار التقرير الفني</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
