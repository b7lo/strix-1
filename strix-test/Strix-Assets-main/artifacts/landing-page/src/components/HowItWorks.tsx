import React from 'react';
import { Smartphone, Zap, FileCheck } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: <Smartphone size={32} />,
    title: 'شغّل تطبيق ستركس',
    desc: 'ابدأ جلسة المراقبة قبل القيادة. ستركس يرافقك بكل كفاءة لضمان سلامتك على الطريق.',
  },
  {
    number: '02',
    icon: <Zap size={32} />,
    title: 'كشف فوري للحادث',
    desc: 'لحظة وقوع الاصطدام، يكتشف ستركس الحادث خلال أجزاء من الثانية ويبدأ التحليل فوراً.',
  },
  {
    number: '03',
    icon: <FileCheck size={32} />,
    title: 'احصل على تقريرك',
    desc: 'تقرير فني شامل بالسرعة، واتجاه الاصطدام، وقوة التأثير، وكروكي توضيحي جاهز للتقديم.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="section-header">
        <span className="section-eyebrow reveal">كيف يعمل</span>
        <h2 className="section-title reveal reveal-delay-1">ثلاث خطوات فقط</h2>
        <p className="section-sub reveal reveal-delay-2">
          خطوات واضحة وبسيطة لضمان حقوقك وتوثيق الحادث بدقة.
        </p>
      </div>

      <div className="how-steps">
        {steps.map((s, i) => (
          <div key={i} className={`how-step reveal reveal-delay-${i + 1}`}>
            <div className="how-step-number">{s.number}</div>
            <div style={{ color: 'var(--strix-green)' }}>{s.icon}</div>
            <div className="how-step-title">{s.title}</div>
            <div className="how-step-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
