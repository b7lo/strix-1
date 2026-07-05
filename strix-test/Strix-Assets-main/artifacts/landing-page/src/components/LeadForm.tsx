import React, { useState } from 'react';
import { submitLead } from '../lib/leads';

interface LeadFormProps {
  icon: string;
}

export default function LeadForm({ icon }: LeadFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('fullName') as HTMLInputElement)?.value ?? '';
    const mobile = (form.elements.namedItem('mobile') as HTMLInputElement)?.value ?? '';
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value ?? '';

    setStatus('submitting');
    setErrorMsg('');
    try {
      await submitLead({ fullName, mobile, email });
      setStatus('success');
      // نُبلغ بقية الصفحة أن عميلًا جديدًا سُجّل ليُحدّث العدّاد فورًا
      window.dispatchEvent(new CustomEvent('strix:lead-registered'));
    } catch {
      setStatus('error');
      setErrorMsg('تعذّر التسجيل الآن. حاول مرة أخرى لاحقًا.');
    }
  };

  return (
    <section className="form-section" id="join">
      <div className="section-header">
        <span className="section-eyebrow reveal">التسجيل المبكر</span>
        <h2 className="section-title reveal reveal-delay-1">كن من أوائل المستخدمين</h2>
        <p className="section-sub reveal reveal-delay-2">
          سجّل الآن للحصول على وصول مبكر وأولوية في الدعم الفني.
        </p>
      </div>

      <div className="form-card reveal">
        {/* Left: Info */}
        <div className="form-info">
          <div className="form-info-logo">
            <img src={icon} alt="Strix" />
            <span>Strix</span>
          </div>

          <h3 className="form-info-title">ابدأ حماية سيارتك اليوم</h3>
          <p className="form-info-sub">
            انضم إلى قائمة الانتظار الحصرية واحصل على وصول مبكر لتطبيق ستركس قبل الإطلاق الرسمي.
          </p>

          <div className="form-perks">
            <div className="form-perk">
              <div className="perk-check">✓</div>
              <span>تطبيق مجاني بالكامل بدون أي رسوم</span>
            </div>
            <div className="form-perk">
              <div className="perk-check">✓</div>
              <span>تحديثات مستمرة ومبكرة للتطبيق</span>
            </div>
            <div className="form-perk">
              <div className="perk-check">✓</div>
              <span>إشعار فوري عند الإطلاق الرسمي</span>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="form-body">
          {status === 'success' ? (
            <div className="form-success">
              <div className="success-icon">✅</div>
              <div className="success-title">شكراً لانضمامك!</div>
              <div className="success-sub">
                تم تسجيل بياناتك بنجاح.<br />سنتواصل معك قريباً عند إطلاق التطبيق.
              </div>
            </div>
          ) : (
            <>
              <h3>سجّل في قائمة الانتظار</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">الاسم الكامل *</label>
                  <input
                    type="text"
                    id="fullName"
                    className="form-input"
                    required
                    placeholder="محمد عبدالله"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="mobile">رقم الجوال *</label>
                  <input
                    type="tel"
                    id="mobile"
                    className="form-input"
                    required
                    placeholder="05X XXX XXXX"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    placeholder="example@email.com"
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                  />
                </div>

                <button
                  type="submit"
                  className="form-submit"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? 'جاري التسجيل...' : 'سجّل الآن — مجاناً'}
                </button>

                {status === 'error' && (
                  <p className="form-privacy" style={{ color: '#e5484d' }}>
                    ⚠️ {errorMsg}
                  </p>
                )}

                <p className="form-privacy">
                  🔒 لن نقوم بمشاركة بياناتك مع أي طرف ثالث.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
