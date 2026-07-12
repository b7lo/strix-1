import React from 'react';
import { ShieldCheck, Activity, MapPin, Scale, FileText, Cloud } from 'lucide-react';

const features = [
  {
    icon: <ShieldCheck size={26} />,
    title: 'يكشف الحادث لحاله',
    desc: 'يقرأ حسّاسات التسارع والجيروسكوب لحظة بلحظة ويمسك التصادم بدقة توصل 99% في أقل من ثانية.',
  },
  {
    icon: <Activity size={26} />,
    title: 'يقيس قوة الصدمة',
    desc: 'يحسب قوة الاصطدام بوحدة G ويصنّف الحادث من بسيط إلى حرج بدقة.',
  },
  {
    icon: <MapPin size={26} />,
    title: 'يحدّد اتجاه الضربة',
    desc: 'يعرف نقطة الاصطدام بالضبط عبر 16 منطقة بالسيارة، ويرسم لك كروكي جاهز.',
  },
  {
    icon: <Scale size={26} />,
    title: 'يقدّر نسبة المسؤولية',
    desc: 'محرك ذكي يقرأ المعطيات ويعطيك نسبة مسؤولية كل طرف بدقة بين 85% و90%.',
  },
  {
    icon: <FileText size={26} />,
    title: 'تقرير يفهمه الكل',
    desc: 'تقرير فني كامل تشاركه مع الجهات المختصة بضغطة وحدة.',
  },
  {
    icon: <Cloud size={26} />,
    title: 'محفوظ بالسحابة',
    desc: 'كل تقاريرك وبياناتك محفوظة بأمان بالسحابة، وترجع لها متى ما تبي.',
  },
];

export default function Features() {
  return (
    <section className="features-section" id="features">
      <div className="section-header">
        <span className="section-eyebrow reveal">الميزات</span>
        <h2 className="section-title reveal reveal-delay-1">توثيق ما يترك<br />مجال للشك</h2>
        <p className="section-sub reveal reveal-delay-2">
          ورا ستركس تقنيات قوية: فلترة إشارة بخوارزميات Kalman، وتحليل لتردد الاهتزاز، ونموذج ذكاء اصطناعي يصنّف الحوادث بدقة عالية.
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
