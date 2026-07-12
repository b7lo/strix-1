import React from 'react';
import { ShieldCheck, Activity, MapPin, Scale, FileText, Cloud } from 'lucide-react';

const features = [
  {
    icon: <ShieldCheck size={26} />,
    title: 'كشف الحوادث تلقائياً',
    desc: 'تحليل فوري لمستشعرات التسارع والجيروسكوب يكشف الاصطدام بدقة تصل إلى 99% في أقل من ثانية.',
  },
  {
    icon: <Activity size={26} />,
    title: 'تحليل قوة الاصطدام',
    desc: 'قياس دقيق لقوة الاصطدام بوحدة G وتصنيف الحادث من طفيف إلى حرج.',
  },
  {
    icon: <MapPin size={26} />,
    title: 'رسم اتجاه الاصطدام',
    desc: 'تحديد نقطة الاصطدام عبر 16 منطقة في المركبة مع كروكي آلي احترافي.',
  },
  {
    icon: <Scale size={26} />,
    title: 'تقدير نسبة المسؤولية',
    desc: 'محرك ذكي يحلل المعطيات ويقدّر نسبة مسؤولية كل طرف بدقة تتراوح بين 85% و90%.',
  },
  {
    icon: <FileText size={26} />,
    title: 'تقارير احترافية',
    desc: 'تقرير فني شامل قابل للمشاركة مع الجهات المختصة.',
  },
  {
    icon: <Cloud size={26} />,
    title: 'مزامنة سحابية آمنة',
    desc: 'حفظ جميع التقارير والبيانات على السحابة مع إمكانية الاسترجاع في أي وقت.',
  },
];

export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="section-header">
        <span className="section-eyebrow reveal">الميزات</span>
        <h2 className="section-title reveal reveal-delay-1">تقنيات متقدمة لتوثيق<br />لا يقبل الشك</h2>
        <p className="section-sub reveal reveal-delay-2">
          بُني ستركس باستخدام خوارزميات Kalman لتصفية الإشارة، وتحليل تردد الاهتزاز، ونموذج ذكاء اصطناعي لتصنيف الحوادث بدقة عالية.
        </p>
      </div>

      <div className="features-grid">
        {features.map((f, i) => (
          <div key={i} className={`feature-card reveal reveal-delay-${Math.min(i + 1, 5)}`}>
            <div className="feature-icon" style={{ color: 'var(--strix-green)' }}>{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
