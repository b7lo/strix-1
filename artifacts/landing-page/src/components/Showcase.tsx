import React from 'react';
import shot1 from '../assets/screenshots/app-1.jpeg';
import shot2 from '../assets/screenshots/app-2.jpeg';
import shot3 from '../assets/screenshots/app-3.jpeg';

const shots = [
  {
    src: shot1,
    title: 'سجل حوادثك محفوظ',
    desc: 'كل حادث تعرّضت له موثّق ومحفوظ عندك في مكان واحد، ترجع له وقت ما تحتاجه بضغطة.',
  },
  {
    src: shot2,
    title: 'كروكي دقيق للحادث',
    desc: 'كروكي يبيّن مكان الصدمة وقوّتها، مع إحداثيات الموقع بالضبط لحظة الحادث.',
  },
  {
    src: shot3,
    title: 'تحليل يوصلك للحقيقة',
    desc: 'مؤشر يبيّن تغيّر سرعتك في آخر 10 ثواني، مع نسبة المسؤولية والسيناريو المتوقّع للحادث.',
  },
];

export default function Showcase() {
  return (
    <section className="showcase-section" id="showcase">
      <div className="section-header">
        <span className="section-eyebrow reveal">من جوّا التطبيق</span>
        <h2 className="section-title reveal reveal-delay-1">شوف ستركس وهو يشتغل</h2>
        <p className="section-sub reveal reveal-delay-2">
          صمّمناه يكون واضح في أصعب اللحظات — كل شاشة تعطيك اللي تحتاجه بدون لف ودوران.
        </p>
      </div>

      <div className="showcase-grid">
        {shots.map((s, i) => (
          <figure key={i} className={`showcase-item reveal reveal-delay-${i + 1}`}>
            <div className="showcase-frame">
              <img src={s.src} alt={s.title} loading="lazy" />
            </div>
            <figcaption className="showcase-caption">
              <h3 className="showcase-title">{s.title}</h3>
              <p className="showcase-desc">{s.desc}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
