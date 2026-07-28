import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PLANS } from '../data/plans';
import SbrLogo from '../components/SbrLogo';

export default function Register({ setActivePage }) {
  const { registerDoctor, registerOrg, activateSubscription } = useApp();
  const { lang, setLang, t, isArabic } = useLanguage();
  const paidPlan = sessionStorage.getItem('selectedPlan') || sessionStorage.getItem('paidPlan');
  const [role, setRole] = useState('doctor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (role === 'doctor') {
      if (!file) {
        setError(isArabic
          ? 'يرجى تحميل مستند إثبات المهنة أو الشهادة الطبية'
          : 'Please upload your medical certificate or professional ID');
        return;
      }
      try {
        const newDoc = await registerDoctor(name, email, phone, password, specialty, null, 'pending', file);
        if (paidPlan) {
          const planMap = {
            'free': 'Free Trial',
            'starter': 'SBR AI Starter',
            'pro': 'SBR AI Pro',
            'business': 'SBR AI Business',
            'enterprise': 'SBR AI Enterprise'
          };
          const planName = planMap[paidPlan] || 'SBR AI Starter';
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          await activateSubscription(newDoc.id, planName, expiryDate.toISOString().split('T')[0]);
          sessionStorage.removeItem('selectedPlan');
          sessionStorage.removeItem('paidPlan');
        }
        setSuccess(true);
      } catch (err) {
        setError(err.message || (isArabic ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration'));
      }
    } else {
      try {
        await registerOrg(name, email, phone, password, specialty);
        setSuccess(true);
      } catch (err) {
        setError(err.message || (isArabic ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration'));
      }
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-canvas">
        <div className={`max-w-md mx-auto bg-white rounded-2xl border border-border-subtle p-10 shadow-lg text-center space-y-4 animate-fade-in`}>
          <span className="material-symbols-outlined text-[64px] text-primary">check_circle</span>
          <h2 className="text-2xl font-bold text-primary">
            {isArabic ? 'تم التسجيل بنجاح! 🎉' : 'Registration Successful! 🎉'}
          </h2>
          <p className="text-sm text-secondary">
            {role === 'doctor'
              ? (isArabic
                ? 'تم إرسال طلب تسجيلك بنجاح. سيتم مراجعة بياناتك والموافقة عليها في أقرب وقت.'
                : 'Your registration request has been submitted. Your credentials will be reviewed and approved shortly.')
              : (isArabic
                ? 'تم إنشاء حساب المنظمة بنجاح. يمكنك الآن تسجيل الدخول.'
                : 'Organization account created successfully. You can now sign in.')}
          </p>
          <button
            onClick={() => setActivePage('login')}
            type="button"
            className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors font-semibold"
          >
            {isArabic ? 'الذهاب لتسجيل الدخول' : 'Back to Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-bg-canvas font-body-md relative ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className={`min-h-screen flex animate-fade-in ${isArabic ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-primary-light via-white to-primary/10 items-center justify-center p-16 relative overflow-hidden border-r border-border-subtle">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>
          
          <div className={`max-w-md space-y-8 relative z-10 ${isArabic ? 'text-right' : 'text-left'}`}>
            <SbrLogo size={56} color="#24564C" showText={true} textClass="text-primary" />
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white border border-border-subtle rounded-full text-xs font-semibold text-primary shadow-sm">
              <span className="material-symbols-outlined text-[16px]">shield_locked</span>
              HIPAA Compliant &amp; SOC2 Certified
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-primary font-headline-lg leading-tight">
                {role === 'doctor'
                  ? (isArabic ? 'انضم لمجتمع أطباء SBR AI' : 'Join the SBR AI Clinician Community')
                  : (isArabic ? 'مكّن فرقك السريرية' : 'Empower Your Clinical Teams')}
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                {role === 'doctor'
                  ? (isArabic
                    ? 'سجّل مساحة عملك لتبدأ استخدام مساعدي الذكاء الاصطناعي السريري، وتوثيق الزيارات الطبية تلقائياً.'
                    : 'Register your workspace to start utilizing high-trust clinical AI assistants, ambient SOAP notes, and modern scheduler boards.')
                  : (isArabic
                    ? 'أنشئ مساحة إدارية. خصّص أطباء متعددين وراقب أداءهم وأدر الاشتراكات المؤسسية.'
                    : 'Establish an administrative workspace. Assign multiple doctors, monitor performance, and manage enterprise subscriptions.')}
              </p>
            </div>
            
            <div className="p-6 bg-white/90 backdrop-blur-md rounded-xl border border-border-subtle shadow-ambient animate-float-up">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg text-lg">
                  {role === 'doctor' ? 'medical_information' : 'corporate_fare'}
                </span>
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider font-label-caps">
                  {role === 'doctor'
                    ? (isArabic ? 'تسجيل آمن' : 'Secure Onboarding')
                    : (isArabic ? 'لوحة الأقسام' : 'Departmental Board')}
                </span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                {role === 'doctor'
                  ? (isArabic
                    ? 'نتحقق من بيانات الاعتماد الطبية للتحقق من المستخدمين السريريين وتأمين مساحة العمل.'
                    : 'We require medical credential checks to verify clinical users and secure the workspace.')
                  : (isArabic
                    ? 'إدارة الأقسام السريرية وتوزيع المقاعد وتحليلات تحويل الكلام إلى نص الخاصة بالذكاء الاصطناعي.'
                    : 'Easily manage clinical departments, seat distributions, and AI transcription analytics.')}
              </p>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24 bg-white overflow-y-auto relative">
          {/* Floating Language Switcher */}
          <div className={`absolute top-6 ${isArabic ? 'left-6' : 'right-6'} z-10`}>
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="mb-4 lg:hidden">
                <SbrLogo size={44} color="#24564C" showText={true} textClass="text-primary" />
              </div>
              <h2 className="font-display-lg text-headline-lg text-primary font-bold">
                {role === 'doctor'
                  ? (isArabic ? 'تسجيل طبيب' : 'Register Doctor')
                  : (isArabic ? 'تسجيل منظمة' : 'Register Organization')}
              </h2>
            <p className="mt-2 text-sm text-secondary text-center">
              {role === 'doctor'
                ? (isArabic ? 'انضم للفريق الطبي لـ SBR AI' : 'Join SBR AI Clinical Team')
                : (isArabic ? 'إنشاء مساحة عمل إدارية للعيادة' : 'Create administrative clinic workspace')}
            </p>
          </div>

          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
            {/* Role Switcher */}
            <div className="flex gap-2 mb-6 p-1 bg-surface-container-low rounded-lg">
              {[
                { key: 'doctor', ar: 'ملف الطبيب', en: 'Doctor Profile' },
                { key: 'org', ar: 'منظمة', en: 'Organization' },
              ].map(({ key, ar, en }) => (
                <button
                  key={key}
                  onClick={() => { setRole(key); setName(''); setEmail(''); setPhone(''); setFile(null); setError(''); }}
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    role === key ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
                  }`}
                >
                  {isArabic ? ar : en}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {role === 'doctor' && paidPlan && (() => {
              const plan = PLANS.find(p => p.id === paidPlan);
              if (!plan) return null;
              const planName = isArabic ? plan.nameAr : plan.nameEn;
              const planPrice = isArabic ? plan.priceAr : plan.priceEn;
              return (
                <div className="mb-4 bg-primary-light text-primary text-xs p-3.5 rounded-lg flex items-start gap-2.5 border border-primary/20 shadow-sm animate-fade-in text-start">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[9px]">
                      {isArabic ? 'باقة الاشتراك المحددة' : 'Selected Subscription Plan'}
                    </p>
                    <p className="mt-0.5 text-secondary font-medium">
                      {t('prepaid_banner', { plan: planName, price: planPrice })}
                    </p>
                  </div>
                </div>
              );
            })()}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {role === 'doctor'
                    ? (isArabic ? 'الاسم الكامل' : 'Full Name')
                    : (isArabic ? 'اسم المنظمة' : 'Organization Name')}
                </label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'doctor' ? (isArabic ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan') : 'Cairo Medical Group'}
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'البريد الإلكتروني' : (role === 'doctor' ? 'Email Address' : 'Organization Email')}
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'doctor' ? 'doctor@example.com' : 'org@cairomed.com'}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {role === 'doctor'
                    ? (isArabic ? 'التخصص الطبي' : 'Specialization')
                    : (isArabic ? 'التخصص / القسم السريري' : 'Specialty / Clinical Department')}
                </label>
                <select
                  value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  {[
                    { val: 'Cardiology', ar: 'أمراض القلب' },
                    { val: 'Neurology', ar: 'الأعصاب' },
                    { val: 'Pediatrics', ar: 'طب الأطفال' },
                    { val: 'Oncology', ar: 'الأورام' },
                    { val: 'General Practice', ar: 'الطب العام' },
                    { val: 'Orthopedics', ar: 'العظام والمفاصل' },
                    { val: 'Dermatology', ar: 'الجلدية' },
                    { val: 'Psychiatry', ar: 'الطب النفسي' },
                    { val: 'ENT', ar: 'أنف وأذن وحنجرة' },
                  ].map(({ val, ar }) => (
                    <option key={val} value={val}>{isArabic ? ar : val}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              {role === 'doctor' && (
                <div>
                  <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? 'الشهادة الطبية / الهوية المهنية (PDF أو صورة)' : 'Medical Certificate / ID (PDF or Image)'}
                  </label>
                  <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-border-subtle border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <span className="material-symbols-outlined text-[36px] text-outline-variant">upload_file</span>
                      <div className="flex text-xs text-secondary justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none">
                          <span>{isArabic ? 'تحميل ملف' : 'Upload a file'}</span>
                          <input
                            type="file" accept="image/*,application/pdf"
                            className="sr-only"
                            onChange={(e) => setFile(e.target.files[0])}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-secondary-fixed-dim">
                        {file ? file.name : (isArabic ? 'PDF أو PNG أو JPG حتى 10MB' : 'PDF, PNG, JPG up to 10MB')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-sm"
              >
                {isArabic ? 'إرسال طلب التسجيل' : 'Submit Registration'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-secondary">
                {isArabic ? 'مسجّل بالفعل؟ ' : 'Already registered? '}
                <button
                  onClick={() => setActivePage('login')}
                  type="button"
                  className="text-primary hover:underline font-semibold"
                >
                  {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
