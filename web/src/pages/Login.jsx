import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';

export default function Login({ setActivePage, isPortal = false }) {
  const { login } = useApp();
  const { lang, setLang, isArabic } = useLanguage();
  const [role, setRole] = useState(isPortal ? 'admin' : 'doctor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password, role);
      if (role === 'admin') {
        setActivePage('admin-overview');
      } else if (role === 'org') {
        setActivePage('org-dashboard');
      } else {
        setActivePage('dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`min-h-screen bg-bg-canvas font-body-md relative ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className={`min-h-screen flex animate-fade-in ${isArabic ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-primary-light via-white to-primary/10 items-center justify-center p-16 relative overflow-hidden border-r border-border-subtle">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>
          
          <div className={`max-w-md space-y-8 relative z-10 ${isArabic ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-3">
              <SbrLogo size={56} color="#24564C" showText={true} textClass="text-primary" />
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-primary font-headline-lg leading-tight">
                {isArabic
                  ? 'رفع دقة التوثيق بالذكاء الاصطناعي'
                  : 'Elevating Clinical Precision with Generative AI'}
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                {isArabic
                  ? 'التقط استشارات المراجعين بشكل طبيعي، وولّد تلقائياً ملاحظات عالية الجودة، وأدر جداولك بسلاسة مع مِسْبَار.'
                  : 'Capture patient consultations naturally, auto-generate high-quality SOAP notes, and manage your schedules seamlessly with SBR AI.'}
              </p>
            </div>
            
            <div className="p-6 bg-white/90 backdrop-blur-md rounded-xl border border-border-subtle shadow-ambient animate-float-up">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg text-lg">auto_awesome</span>
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider font-label-caps">
                  {isArabic ? 'محرك الذكاء المتكامل' : 'Clinical Engine'}
                </span>
              </div>
              <p className="text-sm text-secondary leading-relaxed">
                {isArabic
                  ? 'يستمع الذكاء الاصطناعي في الخلفية ويهيكل بيانات الاستشارة دون تدخل يدوي، مما يتيح لك التركيز على مراجعيك.'
                  : 'Our ambient AI listens in the background and structures the consultation data without manual intervention, allowing you to focus entirely on your patients.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-6 md:py-12 px-6 sm:px-12 lg:px-24 bg-white relative">
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

          {/* Floating Back to Home Button */}
          <div className={`absolute top-6 ${isArabic ? 'right-6' : 'left-6'} z-10`}>
            <button
              onClick={() => setActivePage('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>{isArabic ? 'الرئيسية' : 'Home'}</span>
            </button>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="mb-4 lg:hidden">
                <SbrLogo size={44} color="#24564C" showText={true} textClass="text-primary" />
              </div>
              <h2 className="font-display-lg text-2xl md:text-3xl text-primary font-bold">
                {isArabic ? 'مرحباً بعودتك' : 'Welcome back'}
              </h2>
              <p className="mt-1 text-sm md:text-base text-secondary text-center">
                {isArabic
                  ? 'أدخل بياناتك للوصول إلى مساحة عملك.'
                  : 'Please enter your credentials to access your workspace.'}
              </p>
            </div>

          <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
            {/* Role Switcher */}
            {!isPortal && (
              <div className="flex gap-1 mb-6 p-1 bg-surface-container-low rounded-lg">
                {[
                  { key: 'doctor', ar: 'طبيب', en: 'Doctor' },
                  { key: 'org', ar: 'منظمة', en: 'Organization' },
                ].map(({ key, ar, en }) => (
                  <button
                    key={key}
                    onClick={() => { setRole(key); setEmail(''); setPassword(''); }}
                    type="button"
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${
                      role === key ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {isArabic ? ar : en}
                  </button>
                ))}
              </div>
            )}

            {error && (() => {
              const parts = error.split(' / ');
              let displayError = parts.length > 1
                ? (isArabic ? parts[0] : parts[1])
                : error;
              if (displayError.includes('المحاولات المتبقية') || displayError.includes('Remaining attempts')) {
                displayError = displayError.split('.')[0].trim() + '.';
              }
              return (
                <div className="mb-4 bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2 text-start" dir={isArabic ? 'rtl' : 'ltr'}>
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span className="leading-relaxed font-semibold">{displayError}</span>
                </div>
              );
            })()}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === 'admin'
                      ? 'admin@medical-ai.com'
                      : role === 'org'
                      ? 'org@cardiology.com'
                      : 'doctor@example.com'
                  }
                  className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-semibold text-on-surface-variant">
                    {isArabic ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActivePage('forgot-password')}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-base"
              >
                {isArabic ? 'تسجيل الدخول' : 'Sign In'}
              </button>
            </form>

            {role === 'doctor' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-secondary">
                  {isArabic ? 'طبيب جديد؟ ' : 'New doctor? '}
                  <button
                    onClick={() => setActivePage('register')}
                    type="button"
                    className="text-primary hover:underline font-semibold"
                  >
                    {isArabic ? 'سجّل هنا' : 'Register here'}
                  </button>
                </p>
              </div>
            )}

            {role === 'org' && (
              <div className="mt-6 text-center">
                <p className="text-sm text-secondary">
                  {isArabic ? 'منظمة جديدة؟ ' : 'New organization? '}
                  <button
                    onClick={() => setActivePage('register')}
                    type="button"
                    className="text-primary hover:underline font-semibold"
                  >
                    {isArabic ? 'سجّل منظمتك' : 'Register organization'}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
