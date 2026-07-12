import React from 'react';
import shot1 from '../assets/screenshots/app-1.jpeg';
import shot2 from '../assets/screenshots/app-2.jpeg';
import shot3 from '../assets/screenshots/app-3.jpeg';

const shots = [
  {
    src: shot1,
    title: 'رصد لحظي للحادث',
    desc: 'ستركس يلتقط الاصطدام في أجزاء من الثانية ويبدأ التوثيق فوراً.',
  },
  {
    src: shot2,
    title: 'تحليل بصري دقيق',
    desc: 'قوة الاصطدام واتجاهه وسرعة المركبة، معروضة بوضوح لحظة بلحظة.',
  },
  {
    src: shot3,
    title: 'تقرير جاهز للتقديم',
    desc: 'كروكي احترافي وتقدير لنسبة المسؤولية في تقرير واحد قابل للمشاركة.',
  },
];

export default function Showcase() {
  return (
    <section className="showcase-section" id="showcase">
      <div className="section-header">
        <span className="section-eyebrow reveal">من داخل التطبيق</span>
        <h2 className="section-title reveal reveal-delay-1">شاهد ستركس وهو يعمل</h2>
        <p className="section-sub reveal reveal-delay-2">
          تجربة صُممت لتكون واضحة في أصعب اللحظات — كل شاشة تخبرك بما تحتاج معرفته، دون تعقيد.
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
