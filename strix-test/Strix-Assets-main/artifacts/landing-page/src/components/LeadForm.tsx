import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function LeadForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  return (
    <section className="py-24 bg-muted border-y border-border" id="join">
      <div className="container max-w-4xl">
        <div className="bg-background rounded-3xl border border-border overflow-hidden shadow-2xl flex flex-col md:flex-row">
          
          <div className="p-12 md:w-1/2 flex flex-col justify-center">
            <h2 className="text-title mb-4 text-primary">كن من أوائل المستخدمين</h2>
            <p className="text-body mb-8">
              انضم إلى قائمة الانتظار الحصرية الآن واحصل على وصول مبكر لتطبيق ستريكس قبل الإطلاق الرسمي.
            </p>
            
            <div className="space-y-4 text-sm font-medium">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center">✓</div>
                <span>اشتراك مجاني للمستخدمين الأوائل</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center">✓</div>
                <span>أولوية في الدعم الفني</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center">✓</div>
                <span>تحديثات مستمرة لتقنيات الذكاء الاصطناعي</span>
              </div>
            </div>
          </div>
          
          <div className="p-12 md:w-1/2 bg-gradient-to-br from-primary/5 to-secondary/5 border-r border-border/50">
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-8"
              >
                <div className="w-20 h-20 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">شكراً لانضمامك!</h3>
                <p className="text-muted-foreground">تم تسجيل بياناتك بنجاح. سنقوم بالتواصل معك قريباً.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">الاسم الكامل *</label>
                  <input type="text" id="fullName" className="form-input" required placeholder="محمد عبدالله" />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="mobile">رقم الجوال *</label>
                  <input type="tel" id="mobile" className="form-input text-right" required placeholder="05X XXX XXXX" dir="ltr" />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="email">البريد الإلكتروني</label>
                  <input type="email" id="email" className="form-input" placeholder="example@email.com" dir="ltr" />
                </div>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="userType">نوع الاستخدام المستهدف</label>
                  <select id="userType" className="form-input">
                    <option value="personal">استخدام شخصي</option>
                    <option value="insurance">شركة تأمين / معاينة</option>
                    <option value="fleet">إدارة أسطول مركبات</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-full mt-4" 
                  disabled={status === 'submitting'}
                  style={{ width: '100%' }}
                >
                  {status === 'submitting' ? 'جاري التسجيل...' : 'سجل في قائمة الانتظار'}
                </button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  لن نقوم بمشاركة بياناتك مع أي طرف ثالث.
                </p>
              </form>
            )}
          </div>
          
        </div>
      </div>
    </section>
  );
}
