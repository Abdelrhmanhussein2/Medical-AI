import React, { useState } from 'react';
import SbrLogo from '../components/SbrLogo';
import { useLanguage } from '../context/LanguageContext';
import { DOCTOR_PLANS, ORG_PLANS } from '../data/plans';

export default function Landing({ setActivePage }) {
  const { t, lang, setLang, isArabic } = useLanguage();
  const [pricingTab, setPricingTab] = useState('doctor');
  return (
    <div className="bg-bg-canvas text-on-surface antialiased min-h-screen flex flex-col font-body-md">
      {/* TopNavBar */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-border-subtle transition-all duration-300">
        <div className="max-w-container-max mx-auto px-margin-desktop flex items-center justify-between h-16">
          <div className="flex items-center gap-stack-lg">
            <a className="flex items-center gap-stack-sm group" href="#">
              <SbrLogo size={36} color="#24564C" showText={true} textClass="text-primary" />
            </a>
            <div className="hidden md:flex items-center gap-stack-lg ml-stack-lg font-body-md text-body-md">
              <a className="text-on-surface-variant hover:text-primary-hover transition-colors" href="#platform">
                {isArabic ? 'المنصة' : 'Platform'}
              </a>
              <a className="text-on-surface-variant hover:text-primary-hover transition-colors" href="#solutions">
                {isArabic ? 'الحلول' : 'Solutions'}
              </a>
              <a className="text-on-surface-variant hover:text-primary-hover transition-colors" href="#pricing">
                {isArabic ? 'الأسعار' : 'Pricing'}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-stack-md font-button text-button">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            <button 
              onClick={() => setActivePage('login')}
              className="text-primary hover:text-primary-hover transition-colors px-stack-md py-stack-sm rounded-lg hover:bg-primary-light font-semibold cursor-pointer"
            >
              {isArabic ? 'تسجيل الدخول' : 'Log In'}
            </button>
            <button 
              onClick={() => setActivePage('register')}
              className="bg-primary hover:bg-primary-hover text-on-primary px-stack-md py-stack-sm rounded-lg transition-all duration-300 shadow-sm active:scale-95 font-semibold cursor-pointer"
            >
              {isArabic ? 'ابدأ الآن' : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-bg-canvas pt-stack-lg pb-24 lg:pt-24 lg:pb-32 px-margin-desktop">
          <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
            <div className="flex flex-col gap-stack-lg z-10">
              <div className="inline-flex items-center gap-stack-sm bg-primary-light text-primary px-stack-md py-stack-sm rounded-full font-label-caps text-xs self-start border border-border-subtle">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {isArabic ? 'نقدم لكم مساعد SBR AI 2.0' : 'Introducing SBR AI Assistant 2.0'}
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface font-bold max-w-2xl leading-tight">
                {isArabic ? 'الذكاء الاصطناعي يصبح مساعد الطبيب 🩺' : "AI becomes the doctor's assistant"}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                {isArabic 
                  ? 'سهّل سير عملك السريري باستخدام الذكاء الاصطناعي عالي الثقة. من الإملاء الصوتي المحيطي إلى تحليلات المرضى التنبؤية، استعد الوقت الذي تحتاجه للتركيز على الأهم - مرضاك.'
                  : 'Streamline your clinical workflow with our high-trust AI. From ambient voice dictation to predictive patient analytics, regain the time you need to focus on what matters most—your patients.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-stack-md pt-stack-sm">
                <button 
                  onClick={() => setActivePage('register')}
                  className="bg-primary hover:bg-primary-hover text-on-primary font-button text-button px-stack-lg py-3 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-stack-sm active:scale-95 font-semibold"
                >
                  {t('start_free_trial')}
                  <span className={`material-symbols-outlined text-sm ${isArabic ? 'rotate-180' : ''}`}>arrow_forward</span>
                </button>
                <button className="bg-white hover:bg-surface-container-low text-primary font-button text-button px-stack-lg py-3 rounded-lg border border-border-subtle transition-all duration-300 flex items-center justify-center gap-stack-sm active:scale-95 font-semibold">
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  {isArabic ? 'مشاهدة العرض التجريبي' : 'Watch Demo'}
                </button>
              </div>
              <div className="mt-stack-lg flex items-center gap-stack-md text-on-surface-variant font-body-sm text-sm">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-xs text-secondary">person</span>
                  </div>
                </div>
                <p>{isArabic ? 'يثق به أكثر من 10,000 طبيب حول العالم' : 'Trusted by 10,000+ clinicians globally'}</p>
              </div>
            </div>

            <div class="relative mt-12 lg:mt-0 z-0 flex justify-center">
              {/* Abstract Medical Tech Illustration */}
              <div class="relative w-full max-w-lg aspect-square">
                <div class="absolute inset-0 bg-primary-light rounded-full blur-3xl opacity-50 mix-blend-multiply"></div>
                <div class="absolute right-0 top-0 w-64 h-64 bg-tertiary-fixed-dim/20 rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
                
                {/* Floating UI Elements */}
                <div class="bg-white/80 backdrop-blur-md border border-border-subtle shadow-ambient rounded-xl p-stack-md absolute top-10 left-0 w-64 animate-float-up z-10">
                  <div class="flex items-center gap-stack-sm mb-stack-md border-b border-border-subtle pb-stack-sm">
                    <span class="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
                    <span class="font-label-caps text-[10px] uppercase font-bold text-secondary">Live Dictation Active</span>
                  </div>
                  <p class="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    "Patient presents with mild hypertension. Recommending low-sodium diet and follow-up in 2 weeks..."
                  </p>
                  <div class="mt-stack-md flex gap-2">
                    <span class="px-2 py-1 bg-surface-container-low text-secondary text-[10px] rounded">ICD-10 Extracted</span>
                    <span class="px-2 py-1 bg-primary-light text-primary text-[10px] rounded">Auto-Saved</span>
                  </div>
                </div>

                <div class="bg-white/80 backdrop-blur-md border border-border-subtle shadow-ambient rounded-xl p-stack-md absolute bottom-20 right-0 w-72 animate-float-down z-10">
                  <div class="flex items-center justify-between mb-stack-sm">
                    <span class="font-label-caps text-[10px] uppercase font-bold text-secondary">Risk Analysis</span>
                    <span class="text-status-warning text-xs font-bold">Moderate</span>
                  </div>
                  <div class="w-full bg-surface-container-low rounded-full h-2 mb-stack-md">
                    <div class="bg-status-warning h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div class="space-y-2 font-body-sm text-xs">
                    <div class="flex justify-between border-b border-border-subtle pb-1">
                      <span class="text-on-surface-variant">Cardiovascular</span>
                      <span class="text-on-surface font-semibold">65%</span>
                    </div>
                    <div class="flex justify-between border-b border-border-subtle pb-1">
                      <span class="text-on-surface-variant">Metabolic</span>
                      <span class="text-on-surface font-semibold">42%</span>
                    </div>
                  </div>
                </div>

                {/* Main Hero Image Area */}
                <div class="absolute inset-10 rounded-2xl overflow-hidden border border-border-subtle shadow-xl bg-white z-0">
                  <div 
                    class="bg-cover bg-center w-full h-full opacity-80"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3oOLyIkPH93Bw9IoTc5frn1YBvotqJwVMhRQGcesuy4nPxUSU1Pv0t6kA3Gp3E1oK-3FI2iS4mLzHRa2jGL8mdz2yrNxSDUbWp3GD6H1EUhoFZGJj6mGf2-PdFa2n-APoknpJmLotzLF_4okYEUB6bjxWxGtJyE56Y0H9EYaytJ3gTDKmoaHs6JcM3uBuStqzRA-kwSfbZVXiV1rzzLYz17FhOxlWqdroOFq6wEOmULkFpY1FIDK_xA')" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Section */}
        <section className="py-24 px-margin-desktop bg-white" id="platform">
          <div className="max-w-container-max mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">
                {isArabic ? 'محرك الذكاء السريري المتكامل' : 'Intelligent Clinical Engine'}
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {isArabic
                  ? 'SBR AI هو محرك سريري مدعوم بالذكاء الاصطناعي مُصمَّم من الأساس لأتمتة التوثيق المعقد، وتبسيط سير العمل اليومي، وضمان الامتثال لمعايير HIPAA في جميع العمليات.'
                  : 'SBR AI is an AI-powered clinical engine designed from the ground up to automate complex documentation, intuitively streamline your daily workflows, and strictly ensure HIPAA compliance across all operations.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {[
                {
                  icon: 'auto_awesome',
                  titleAr: 'توثيق طبي تلقائي',
                  titleEn: 'Automated Documentation',
                  descAr: 'تخلّص من ساعات الإدخال اليدوي للبيانات من خلال معالجة اللغة الطبيعية المتقدمة التي تفهم السياق الطبي.',
                  descEn: 'Eliminate hours of manual data entry with our advanced natural language processing that understands medical context.'
                },
                {
                  icon: 'account_tree',
                  titleAr: 'سير عمل مبسّط وفعّال',
                  titleEn: 'Streamlined Workflows',
                  descAr: 'تكامل سلس مع عملياتك الحالية لتقليل النقرات والتركيز الكامل على رعاية المرضى.',
                  descEn: 'Integrate seamlessly with your existing processes to reduce clicks and keep the focus entirely on patient care.'
                },
                {
                  icon: 'shield_locked',
                  titleAr: 'متوافق مع HIPAA',
                  titleEn: 'HIPAA Compliant',
                  descAr: 'بنية أمان مؤسسية تضمن تشفير جميع بيانات صحة المرضى وحمايتها الصارمة.',
                  descEn: 'Enterprise-grade security architecture ensuring all patient health information is encrypted and strictly protected.'
                }
              ].map(({ icon, titleAr, titleEn, descAr, descEn }) => (
                <div key={icon} className="bg-bg-canvas p-stack-lg rounded-xl border border-border-subtle text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto bg-primary-light rounded-full flex items-center justify-center mb-stack-md text-primary">
                    <span className="material-symbols-outlined text-3xl">{icon}</span>
                  </div>
                  <h3 className="font-headline-md text-base text-on-surface font-bold mb-stack-sm">
                    {isArabic ? titleAr : titleEn}
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    {isArabic ? descAr : descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section className="py-24 px-margin-desktop bg-bg-canvas" id="solutions">
          <div className="max-w-container-max mx-auto">
            <div className={`mb-16 ${isArabic ? 'text-right' : 'text-left'}`}>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">
                {isArabic ? 'حلول للممارسة الطبية الحديثة' : 'Solutions for Modern Practice'}
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                {isArabic
                  ? 'أدوات متطورة وعملية مبنية لحل التحديات الواقعية التي يواجهها المهنيون الطبيون كل يوم.'
                  : 'Practical, cutting-edge tools built to solve the real-world challenges faced by medical professionals every day.'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {[
                {
                  icon: 'mic',
                  titleAr: 'الإملاء الصوتي المحيطي',
                  titleEn: 'Ambient Voice Dictation',
                  descAr: 'التقط مقابلات المرضى الكاملة بشكل طبيعي. يستمع ذكاؤنا الاصطناعي المحيطي في الخلفية ويهيكل بيانات الاستشارة بذكاء دون تدخل يدوي.',
                  descEn: 'Capture complete patient encounters naturally. Our ambient AI listens in the background and intelligently structures the consultation data without manual intervention.'
                },
                {
                  icon: 'description',
                  titleAr: 'ملاحظات SOAP تلقائية',
                  titleEn: 'Automated SOAP Notes',
                  descAr: 'أنشئ على الفور ملاحظات SOAP دقيقة وشاملة جاهزة للمراجعة فور انتهاء الزيارة.',
                  descEn: 'Instantly generate accurate, comprehensive SOAP notes ready for review immediately after the patient visit concludes.'
                },
                {
                  icon: 'calendar_month',
                  titleAr: 'إدارة الجداول الزمنية',
                  titleEn: 'Schedule Management',
                  descAr: 'حسّن كفاءة عيادتك بالجدولة الذكية التي تتوقع مدة المواعيد وتقلّل أوقات انتظار المرضى.',
                  descEn: 'Optimize your organizational efficiency with smart scheduling that anticipates appointment durations and minimizes patient wait times.'
                },
                {
                  icon: 'insights',
                  titleAr: 'التحليلات التنبؤية',
                  titleEn: 'Predictive Analytics',
                  descAr: 'استفد من البيانات التاريخية لتحديد مخاطر المرضى المحتملة مبكراً، ودعم استراتيجيات الرعاية الوقائية الاستباقية.',
                  descEn: 'Leverage historical data to identify potential patient risks early, supporting proactive and preventative care strategies.'
                }
              ].map(({ icon, titleAr, titleEn, descAr, descEn }) => (
                <div key={icon} className={`flex gap-stack-md bg-white p-stack-lg rounded-xl border border-border-subtle ${isArabic ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                  <div className="flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-base text-on-surface font-bold mb-stack-sm">
                      {isArabic ? titleAr : titleEn}
                    </h3>
                    <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                      {isArabic ? descAr : descEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-margin-desktop bg-white border-t border-border-subtle" id="pricing">
          <div className="max-w-container-max mx-auto">

            <div className="text-center mb-12">
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-md">
                {t('pricing_title')}
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                {isArabic
                  ? 'أسعار شفافة للأطباء المستقلين والمنظمات الطبية.'
                  : 'Transparent pricing for solo clinicians and medical organizations.'}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center bg-surface-container-low border border-border-subtle rounded-xl p-1 gap-1">
                <button
                  onClick={() => setPricingTab('doctor')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    pricingTab === 'doctor'
                      ? 'bg-white text-primary shadow-sm border border-border-subtle'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                  {isArabic ? 'للأطباء' : 'For Doctors'}
                </button>
                <button
                  onClick={() => setPricingTab('org')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    pricingTab === 'org'
                      ? 'bg-white text-primary shadow-sm border border-border-subtle'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
                  {isArabic ? 'للمنظمات' : 'For Organizations'}
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {(pricingTab === 'doctor' ? DOCTOR_PLANS : ORG_PLANS).map((plan) => {
                const name     = isArabic ? plan.nameAr     : plan.nameEn;
                const features = isArabic ? plan.featuresAr : plan.featuresEn;
                const badge    = isArabic ? plan.badgeAr    : plan.badgeEn;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-7 border flex flex-col relative transition-all duration-300 hover:shadow-lg ${
                      plan.highlight
                        ? 'bg-white border-2 border-primary ring-4 ring-primary-light/50 shadow-md -translate-y-1'
                        : 'bg-bg-canvas border-border-subtle shadow-sm'
                    }`}
                  >
                    {badge && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary font-label-caps text-[9px] px-4 py-1 rounded-full uppercase tracking-wider font-bold shadow whitespace-nowrap">
                        {badge}
                      </div>
                    )}

                    <h3 className="font-headline-md text-lg text-on-surface font-bold mb-1">{name}</h3>

                    <div className="mb-5 flex items-baseline gap-1">
                      <span className="text-4xl font-black text-primary">$</span>
                      <span className="text-4xl font-black text-primary">{plan.priceEn}</span>
                      <span className="text-on-surface-variant text-xs ml-1">USD / {isArabic ? 'شهر' : 'mo'}</span>
                    </div>

                    <div className="flex gap-2 mb-5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-primary-light text-primary px-2.5 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-[13px]">mic</span>
                        {plan.minutes.toLocaleString()} {isArabic ? 'د' : 'min'}
                      </span>
                      {plan.doctorsIncluded && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-surface-container text-secondary px-2.5 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[13px]">group</span>
                          {plan.doctorsIncluded} {isArabic ? 'أطباء' : 'doctors'}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-7 text-[12px] text-on-surface-variant flex-grow text-start">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">check_circle</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => {
                        sessionStorage.setItem('selectedPlan', plan.id);
                        setActivePage(`/checkout?plan=${plan.id}`);
                      }}
                      className={`w-full font-button py-3 rounded-xl transition-all duration-200 font-bold text-sm cursor-pointer active:scale-95 ${
                        plan.highlight
                          ? 'bg-primary hover:bg-primary-hover text-on-primary shadow-sm'
                          : 'bg-white hover:bg-surface-container text-primary border-2 border-primary/20 hover:border-primary'
                      }`}
                    >
                      {t('get_started')}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-secondary mt-8">
              {isArabic ? 'جميع الأسعار بالدولار الأمريكي شهرياً. يمكن الإلغاء في أي وقت.' : 'All prices in USD / month. Cancel anytime.'}
            </p>

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border-subtle mt-auto">
        <div className="max-w-container-max mx-auto px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center gap-stack-md">
          <div className="flex flex-col items-center md:items-start gap-stack-sm">
            <div className="flex items-center gap-2">
              <SbrLogo size={30} color="#24564C" showText={true} textClass="text-on-surface" />
            </div>
            <p class="font-body-sm text-xs text-on-surface-variant">© 2026 SBR AI Systems. HIPAA Compliant & SOC2 Certified.</p>
          </div>
          <div class="flex flex-wrap justify-center gap-stack-md font-body-sm text-xs text-on-surface-variant">
            <a class="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a class="hover:text-primary transition-colors" href="#">Terms of Service</a>
            <a class="hover:text-primary transition-colors" href="#">Security</a>
            <a class="hover:text-primary transition-colors" href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
