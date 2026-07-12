import React from 'react';
import { Smartphone, Zap, FileCheck } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: <Smartphone size={32} />,
    title: 'شغّل ستركس',
    desc: 'قبل ما تسوق، ابدأ جلسة المراقبة، وخلّ ستركس يرافقك ويطمّنك طول الطريق.',
  },
  {
    number: '02',
    icon: <Zap size={32} />,
    title: 'يمسك الحادث لحظته',
    desc: 'أول ما يصير التصادم، ستركس يكتشفه في أجزاء من الثانية ويبدأ التحليل على طول.',
  },
  {
    number: '03',
    icon: <FileCheck size={32} />,
    title: 'خذ تقريرك',
    desc: 'تقرير كامل بالسرعة واتجاه الصدمة وقوتها، مع كروكي توضيحي جاهز تقدّمه.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="section-header">
        <span className="section-eyebrow reveal">كيف يشتغل</span>
        <h2 className="section-title reveal reveal-delay-1">ثلاث خطوات وبس</h2>
        <p className="section-sub reveal reveal-delay-2">
          خطوات بسيطة وواضحة تضمن حقّك وتوثّق الحادث بدقة.
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
