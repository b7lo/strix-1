import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CarFront, Activity } from 'lucide-react';

export default function Hero() {
  return (
    <section className="py-24 bg-gradient-primary">
      <div className="container grid grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-hero mb-4">
            ستريكس <br />
            <span className="text-gradient">أذكى نظام لرصد الحوادث</span>
          </h1>
          <p className="text-subtitle mb-8">
            حول هاتفك الذكي إلى جهاز متطور لرصد حوادث المركبات آلياً باستخدام الذكاء الاصطناعي. احصل على تقارير فنية دقيقة فور وقوع الحادث لدعم مطالبك التأمينية بثقة وشفافية.
          </p>
          <div className="flex gap-4">
            <button className="btn btn-primary">انضم لقائمة الانتظار</button>
            <button className="btn btn-outline">اكتشف المزيد</button>
          </div>
          
          <div className="flex gap-8 mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)'}}>
            <div>
              <div className="text-title text-secondary">90%</div>
              <div className="text-body text-sm">دقة في رصد نقاط التصادم</div>
            </div>
            <div>
              <div className="text-title text-accent">10s</div>
              <div className="text-body text-sm">تحليل ما قبل الاصطدام</div>
            </div>
            <div>
              <div className="text-title text-primary">16</div>
              <div className="text-body text-sm">منطقة رصد في المركبة</div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-muted p-8 rounded-3xl border border-border relative overflow-hidden" style={{ aspectRatio: '9/16', maxWidth: '300px', margin: '0 auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'}}>
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30px', background: 'var(--background)', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid var(--border)'}}>
                <div style={{ width: '60px', height: '6px', background: 'var(--border)', borderRadius: '10px'}}></div>
             </div>
             
             <div className="mt-12 flex flex-col gap-4">
                <div className="p-4 bg-background rounded-2xl border border-border shadow-sm flex items-center gap-4">
                   <div className="p-3 bg-red-100 text-red-600 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>
                     <ShieldAlert size={24} />
                   </div>
                   <div>
                     <div className="font-bold text-sm">تم رصد اصطدام قوي</div>
                     <div className="text-xs text-muted-foreground">يتم تحليل البيانات الآن...</div>
                   </div>
                </div>
                
                <div className="p-4 bg-background rounded-2xl border border-border shadow-sm">
                   <div className="flex items-center gap-3 mb-3">
                     <CarFront className="text-secondary" size={20} />
                     <span className="font-bold text-sm">نقطة التصادم: أمام يسار</span>
                   </div>
                   <div style={{ width: '100%', height: '120px', background: 'var(--muted)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="text-muted-foreground text-xs">رسم توضيحي للمركبة</span>
                   </div>
                </div>
                
                <div className="p-4 bg-background rounded-2xl border border-border shadow-sm flex flex-col gap-2">
                   <div className="flex justify-between items-center text-sm">
                     <span className="flex items-center gap-2"><Activity size={16} className="text-muted-foreground" /> السرعة</span>
                     <span className="font-bold text-red-500">85 كم/س</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="flex items-center gap-2"><Activity size={16} className="text-muted-foreground" /> الانحراف</span>
                     <span className="font-bold text-orange-500">حادة (يمين)</span>
                   </div>
                </div>
                
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                  إصدار التقرير الفني
                </button>
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
