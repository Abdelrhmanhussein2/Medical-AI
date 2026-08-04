import React, { useState } from 'react';
import SbrLogo from '../components/SbrLogo';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

// ── FAQ Data ──────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    qAr: 'ما هو SBR AI وكيف يُفيد الأطباء؟',
    qEn: 'What is SBR AI and how does it benefit clinicians?',
    aAr: 'SBR AI هو مساعد ذكاء اصطناعي سريري متكامل مصمَّم خصيصاً للأطباء. يقوم بتوثيق مقابلات المرضى تلقائياً عبر الإملاء الصوتي المحيطي، ويُنشئ ملاحظات SOAP دقيقة، ويدير الجداول الزمنية — مما يُتيح للطبيب التركيز الكامل على رعاية المريض بدلاً من الإدخال اليدوي للبيانات.',
    aEn: 'SBR AI is a comprehensive clinical AI assistant designed specifically for physicians. It automatically documents patient encounters through ambient voice dictation, generates accurate SOAP notes, and manages schedules — allowing clinicians to focus entirely on patient care instead of manual data entry.',
  },
  {
    qAr: 'كيف تحمي SBR AI بيانات مرضاي؟',
    qEn: 'How does SBR AI protect my patients\' data?',
    aAr: 'تعتمد SBR AI بنية تقنية تهدف إلى حماية بيانات المستخدمين والمرضى. يتم تشفير البيانات أثناء النقل وفي حالة السكون. لا نشارك أو نبيع أي بيانات طبية لجهات خارجية. تتم معالجة المدفوعات عبر بوابة دفع خارجية آمنة ولا نحتفظ ببيانات البطاقات البنكية.',
    aEn: 'SBR AI uses a technical architecture designed to protect user and patient data. Data is encrypted both in transit and at rest. We do not share or sell any medical data to third parties. Payments are processed through a secure external payment gateway and we do not store bank card data.',
  },
  {
    qAr: 'كيف يعمل الإملاء الصوتي المحيطي؟',
    qEn: 'How does ambient voice dictation work?',
    aAr: 'يستمع النظام إلى محادثة الطبيب والمريض بشكل طبيعي دون الحاجة إلى أي أوامر يدوية. يقوم الذكاء الاصطناعي بتحليل السياق الطبي في الوقت الفعلي وتحويله إلى ملاحظات سريرية منظَّمة جاهزة للمراجعة فور انتهاء الزيارة.',
    aEn: 'The system listens to the doctor-patient conversation naturally without any manual commands. The AI analyzes the medical context in real time and converts it into structured clinical notes ready for review immediately after the visit ends.',
  },
  {
    qAr: 'هل يمكنني تخصيص قوالب التوثيق السريري؟',
    qEn: 'Can I customize clinical documentation templates?',
    aAr: 'بالتأكيد. يُتيح SBR AI إنشاء قوالب توثيق مخصصة تتناسب مع تخصصك الطبي وأسلوب ممارستك. يمكنك تحديد الحقول السريرية المطلوبة، والاستعانة بالذكاء الاصطناعي لاستخراجها تلقائياً من محادثة المريض.',
    aEn: 'Absolutely. SBR AI allows you to create custom documentation templates tailored to your specialty and practice style. You can define the required clinical fields and leverage AI to automatically extract them from patient conversations.',
  },
  {
    qAr: 'ما الفرق بين باقة الطبيب وباقة المنظمة؟',
    qEn: 'What is the difference between the Doctor and Organization plans?',
    aAr: 'باقة الطبيب مُصمَّمة للممارسين المستقلين وتشمل الميزات الأساسية للإملاء الصوتي وإدارة المرضى. أما باقة المنظمة فتشمل دعماً لعدد متعدد من الأطباء، ولوحة تحكم مركزية، وتقارير إحصائية متقدمة، وتكاملاً مع الأنظمة الطبية الحالية.',
    aEn: 'The Doctor plan is designed for independent practitioners and includes core features for voice dictation and patient management. The Organization plan includes support for multiple physicians, a centralized dashboard, advanced analytics, and integration with existing medical systems.',
  },
  {
    qAr: 'هل توجد فترة تجريبية مجانية؟',
    qEn: 'Is there a free trial period?',
    aAr: 'نعم، يمكنك البدء بتجربة مجانية تتيح لك استكشاف كافة ميزات المنصة دون الحاجة إلى بيانات بطاقة ائتمانية. ستتمكن من تجربة الإملاء الصوتي، وإنشاء القوالب، وإدارة المواعيد بشكل كامل خلال فترة التجربة.',
    aEn: 'Yes, you can start with a free trial that lets you explore all platform features without requiring a credit card. You will be able to test voice dictation, template creation, and appointment management in full during the trial period.',
  },
  {
    qAr: 'كيف تتعامل المنصة مع اللغة العربية؟',
    qEn: 'How does the platform handle the Arabic language?',
    aAr: 'تم تصميم SBR AI مع دعم كامل للغة العربية من الألف إلى الياء. يشمل ذلك التعرف على الكلام الطبي باللغة العربية، وإنشاء التقارير السريرية بالعربية، وواجهة مستخدم متكيّفة مع اتجاه الكتابة من اليمين إلى اليسار.',
    aEn: 'SBR AI was designed with full Arabic language support from the ground up. This includes Arabic medical speech recognition, clinical report generation in Arabic, and a UI fully adapted to right-to-left text direction.',
  },
  {
    qAr: 'ما هي قنوات الدعم الفني المتاحة؟',
    qEn: 'What technical support channels are available?',
    aAr: 'نُقدِّم دعماً فنياً متكاملاً عبر البريد الإلكتروني على العنوان contact@sbr-ai.com، إضافةً إلى قاعدة معرفية شاملة ووثائق تقنية مفصَّلة. تحظى عملاء باقة المنظمة بمدير حساب مخصص وخط دعم ذو أولوية.',
    aEn: 'We provide comprehensive technical support via email at contact@sbr-ai.com, along with an extensive knowledge base and detailed technical documentation. Organization plan customers receive a dedicated account manager and a priority support line.',
  },
];

export default function Landing({ setActivePage }) {
  const { t, lang, setLang, isArabic } = useLanguage();
  const { doctorPlans, orgPlans } = useApp();
  const [pricingTab, setPricingTab] = useState('doctor');
  const [openFaq, setOpenFaq] = useState(null);
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
              <a className="text-on-surface-variant hover:text-primary-hover transition-colors" href="#faq">
                {isArabic ? 'الأسئلة الشائعة' : 'FAQ'}
              </a>
              <a className="text-on-surface-variant hover:text-primary-hover transition-colors" href="#contact">
                {isArabic ? 'تواصل معنا' : 'Contact'}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-stack-md font-button text-button">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'العربية'}</span>
              <span className="sm:hidden">{lang === 'ar' ? 'EN' : 'AR'}</span>
            </button>
            <button 
              onClick={() => setActivePage('login')}
              className="text-primary hover:text-primary-hover transition-colors px-2 py-1 md:px-stack-md md:py-stack-sm rounded-lg hover:bg-primary-light text-xs md:text-sm font-semibold cursor-pointer"
            >
              {isArabic ? 'دخول' : 'Login'}
            </button>
            <button 
              onClick={() => setActivePage('register')}
              className="bg-primary hover:bg-primary-hover text-on-primary px-2.5 py-1.5 md:px-stack-md md:py-stack-sm rounded-lg transition-all duration-300 shadow-sm active:scale-95 text-xs md:text-sm font-semibold cursor-pointer"
            >
              {isArabic ? 'سجل' : 'Register'}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-white to-bg-canvas pt-6 pb-12 lg:pt-24 lg:pb-32 px-4 md:px-margin-desktop">
          <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center">
            <div className="flex flex-col gap-stack-lg z-10">
              <div className="inline-flex items-center gap-stack-sm bg-primary-light text-primary px-stack-md py-stack-sm rounded-full font-label-caps text-xs self-start border border-border-subtle">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {isArabic ? 'نقدم لكم مساعد SBR AI 2.0' : 'Introducing SBR AI Assistant 2.0'}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:font-display-lg lg:text-display-lg text-on-surface font-bold max-w-2xl leading-tight">
                {isArabic ? 'الذكاء الاصطناعي يصبح مساعد الطبيب 🩺' : "AI becomes the doctor's assistant 🩺"}
              </h1>
              <p className="text-sm md:font-body-lg md:text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                {isArabic 
                  ? 'سهّل سير عملك السريري باستخدام الذكاء الاصطناعي. من الإملاء الصوتي إلى تحليلات المرضى، استعد الوقت للتركيز على مرضاك.'
                  : 'Streamline your clinical workflow with high-trust AI. From ambient voice dictation to predictive analytics, regain time to focus on what matters most—your patients.'}
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
                <p>{isArabic ? 'صُمِّم لمساعدة الأطباء على العمل بكفاءة أعلى' : 'Designed to help clinicians work smarter'}</p>
              </div>
            </div>

            <div class="relative mt-8 lg:mt-0 z-0 hidden lg:flex justify-center">
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
                  ? 'SBR AI هو محرك سريري مدعوم بالذكاء الاصطناعي مُصمَّم من الأساس لأتمتة التوثيق المعقد، وتبسيط سير العمل اليومي، وتمكين الأطباء من التركيز الكامل على رعاية مرضاهم.'
                  : 'SBR AI is an AI-powered clinical engine designed from the ground up to automate complex documentation, intuitively streamline your daily workflows, and free clinicians to focus entirely on patient care.'}
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
                  icon: 'lock',
                  titleAr: 'حماية بيانات المرضى',
                  titleEn: 'Patient Data Protection',
                  descAr: 'بياناتك وبيانات مرضاك مشفّرة أثناء النقل والتخزين. لا نبيع أو نشارك المعلومات الطبية مع أي جهة خارجية.',
                  descEn: 'Your data and your patients\' data is encrypted in transit and at rest. We never sell or share medical information with third parties.'
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
              {(pricingTab === 'doctor' ? doctorPlans : orgPlans).map((plan) => {
                const name     = isArabic ? plan.nameAr     : plan.nameEn;
                const features = isArabic ? plan.featuresAr : plan.featuresEn;
                const badge    = isArabic ? plan.badgeAr    : plan.badgeEn;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 md:p-7 border flex flex-col relative transition-all duration-300 hover:shadow-lg ${
                      plan.highlight
                        ? 'bg-white border-2 border-primary ring-4 ring-primary-light/50 shadow-md -translate-y-1'
                        : 'bg-bg-canvas border-border-subtle shadow-sm'
                    }`}
                  >
                    {badge && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary font-label-caps text-[9px] px-3.5 py-0.5 rounded-full uppercase tracking-wider font-bold shadow whitespace-nowrap">
                        {badge}
                      </div>
                    )}

                    <h3 className="font-headline-md text-base md:text-lg text-on-surface font-bold mb-1">{name}</h3>

                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-2xl md:text-4xl font-black text-primary">
                        {plan.id === 'free' ? (isArabic ? 'مجاناً' : 'Free') : plan.priceEn}
                      </span>
                      {plan.id !== 'free' && (
                        <span className="text-on-surface-variant text-xs ml-1">
                          {isArabic ? 'ريال' : 'SAR'} / {isArabic ? 'شهر' : 'mo'}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mb-4 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold bg-primary-light text-primary px-2.5 py-1 rounded-lg">
                        <span className="material-symbols-outlined text-[13px]">mic</span>
                        {plan.minutes.toLocaleString()} {isArabic ? 'د' : 'min'}
                      </span>
                      {plan.doctorsIncluded && (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold bg-surface-container text-secondary px-2.5 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-[13px]">group</span>
                          {plan.doctorsIncluded} {isArabic ? 'أطباء' : 'doctors'}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1.5 md:space-y-2.5 mb-5 md:mb-7 text-[11px] md:text-[12px] text-on-surface-variant flex-grow text-start">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-primary text-[14px] md:text-[15px] shrink-0 mt-0.5">check_circle</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => {
                        sessionStorage.setItem('selectedPlan', plan.id);
                        setActivePage(`/checkout?plan=${plan.id}`);
                      }}
                      className={`w-full font-button py-2.5 md:py-3 rounded-xl transition-all duration-200 font-bold text-sm cursor-pointer active:scale-95 ${
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
              {isArabic ? 'جميع الأسعار بالريال السعودي شهرياً. يمكن الإلغاء في أي وقت.' : 'All prices in SAR / month. Cancel anytime.'}
            </p>

          </div>
        </section>

        {/* ── FAQ Section ────────────────────────────────────────────── */}
        <section className="py-24 px-margin-desktop bg-bg-canvas" id="faq">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-4">
                <span className="material-symbols-outlined text-[15px]">help</span>
                {isArabic ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-4">
                {isArabic ? 'إجابات على أبرز تساؤلاتكم' : 'Answers to Your Most Common Questions'}
              </h2>
              <p className="text-on-surface-variant text-body-lg leading-relaxed max-w-xl mx-auto">
                {isArabic
                  ? 'وجدنا أن هذه الأسئلة تُطرح بشكل متكرر من قِبَل الأطباء والمؤسسات الصحية. إذا لم تجد إجابتك هنا، تواصل معنا مباشرةً.'
                  : 'These are the questions most frequently asked by clinicians and healthcare organizations. If you cannot find your answer here, contact us directly.'}
              </p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? 'border-primary/30 bg-white shadow-md'
                        : 'border-border-subtle bg-white hover:border-primary/20 hover:shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className={`w-full flex items-center justify-between px-6 py-5 text-start gap-4 cursor-pointer group`}
                    >
                      <span className={`font-semibold text-sm leading-snug transition-colors ${
                        isOpen ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                      }`}>
                        {isArabic ? item.qAr : item.qEn}
                      </span>
                      <span className={`material-symbols-outlined text-[22px] shrink-0 transition-all duration-300 ${
                        isOpen ? 'text-primary rotate-180' : 'text-secondary'
                      }`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className={`px-6 pb-6 text-sm text-on-surface-variant leading-relaxed border-t border-border-subtle pt-4 ${
                        isArabic ? 'text-right' : 'text-left'
                      }`}>
                        {isArabic ? item.aAr : item.aEn}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-on-surface-variant">
                {isArabic ? 'لم تجد إجابتك؟ ' : "Didn't find your answer? "}
                <a href="#contact" className="text-primary font-bold hover:underline">
                  {isArabic ? 'تواصل معنا مباشرةً' : 'Contact us directly'}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Contact Section ─────────────────────────────────────────── */}
        <section className="py-24 px-margin-desktop bg-white border-t border-border-subtle" id="contact">
          <div className="max-w-container-max mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Left: Message */}
              <div className={isArabic ? 'text-right' : 'text-left'}>
                <span className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-5">
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  {isArabic ? 'تواصل معنا' : 'Get in Touch'}
                </span>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-5 leading-tight">
                  {isArabic
                    ? 'هل أنت مستعد للارتقاء بعيادتك إلى مستوى آخر؟'
                    : 'Ready to elevate your practice to the next level?'}
                </h2>
                <p className="text-on-surface-variant text-body-lg leading-relaxed mb-8">
                  {isArabic
                    ? 'فريقنا من خبراء الرعاية الصحية والتكنولوجيا مستعد للإجابة على جميع استفساراتك، ومساعدتك في اختيار الباقة المناسبة لاحتياجاتك، وإرشادك خلال مراحل التطبيق والتدريب.'
                    : 'Our team of healthcare and technology experts is ready to answer all your inquiries, help you select the right plan for your needs, and guide you through implementation and training.'}
                </p>

                {/* Contact Details */}
                <div className="space-y-4">
                  <a
                    href="mailto:contact@sbr-ai.com"
                    className={`flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-bg-canvas hover:border-primary/30 hover:shadow-sm transition-all group ${
                      isArabic ? 'flex-row-reverse text-right' : ''
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">mail</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider mb-0.5">
                        {isArabic ? 'البريد الإلكتروني' : 'Email'}
                      </p>
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                        contact@sbr-ai.com
                      </p>
                    </div>
                  </a>

                  <div className={`flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-bg-canvas ${
                    isArabic ? 'flex-row-reverse text-right' : ''
                  }`}>
                    <div className="w-11 h-11 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">schedule</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider mb-0.5">
                        {isArabic ? 'ساعات الدعم' : 'Support Hours'}
                      </p>
                      <p className="text-sm font-bold text-on-surface">
                        {isArabic ? 'الأحد – الخميس، 9 ص – 6 م' : 'Sun – Thu, 9 AM – 6 PM GST'}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-bg-canvas ${
                    isArabic ? 'flex-row-reverse text-right' : ''
                  }`}>
                    <div className="w-11 h-11 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider mb-0.5">
                        {isArabic ? 'حماية البيانات' : 'Data Protection'}
                      </p>
                      <p className="text-sm font-bold text-on-surface">
                        {isArabic ? 'بياناتك مشفّرة ومحمية' : 'Your data is encrypted & protected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: CTA Card */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-10 text-on-primary shadow-xl relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full" />
                <div className="relative z-10">
                  <span className="material-symbols-outlined text-5xl mb-5 block opacity-80">stethoscope</span>
                  <h3 className="text-2xl font-bold mb-3 leading-snug">
                    {isArabic ? 'ابدأ تجربتك المجانية اليوم' : 'Start Your Free Trial Today'}
                  </h3>
                  <p className="text-on-primary/80 text-sm leading-relaxed mb-8">
                    {isArabic
                      ? 'لا حاجة لبطاقة ائتمانية. ابدأ في دقائق واكتشف كيف يُحوِّل SBR AI ممارستك الطبية.'
                      : 'No credit card required. Get started in minutes and discover how SBR AI transforms your medical practice.'}
                  </p>
                  <button
                    onClick={() => setActivePage('register')}
                    className="w-full bg-white text-primary font-bold py-3.5 rounded-xl hover:bg-primary-light transition-all duration-200 active:scale-95 text-sm shadow-sm mb-3"
                  >
                    {isArabic ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                  </button>
                  <button
                    onClick={() => setActivePage('login')}
                    className="w-full border border-white/30 text-on-primary font-bold py-3 rounded-xl hover:bg-white/10 transition-all duration-200 text-sm"
                  >
                    {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                  </button>
                  <p className="text-center text-xs text-on-primary/60 mt-4">
                    {isArabic ? 'لا حاجة لبطاقة ائتمانية — ابدأ مجاناً الآن' : 'No credit card required — start for free today'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-primary text-white border-t border-primary-container/10">
        <div className="max-w-container-max mx-auto px-margin-desktop pt-16 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

            {/* Brand */}
            <div className="md:col-span-1">
              <SbrLogo size={32} color="#fff" showText={true} textClass="text-white" />
              <p className="text-white/80 text-xs leading-relaxed mt-4">
                {isArabic
                  ? 'منصة الذكاء الاصطناعي السريري المتكاملة. نُساعد الأطباء على تقديم رعاية أفضل بوقت أقل.'
                  : 'The integrated clinical AI platform. We help physicians deliver better care in less time.'}
              </p>
              <a
                href="mailto:contact@sbr-ai.com"
                className="inline-flex items-center gap-2 mt-4 text-white/90 hover:text-white text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">mail</span>
                contact@sbr-ai.com
              </a>
            </div>

            {/* Platform */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
                {isArabic ? 'المنصة' : 'Platform'}
              </h4>
              <ul className="space-y-3 text-white/80 text-xs">
                {[
                  { ar: 'الإملاء الصوتي المحيطي', en: 'Ambient Voice Dictation' },
                  { ar: 'ملاحظات SOAP التلقائية', en: 'Automated SOAP Notes' },
                  { ar: 'إدارة المواعيد', en: 'Appointment Management' },
                  { ar: 'التحليلات التنبؤية', en: 'Predictive Analytics' },
                ].map((l, i) => (
                  <li key={i}><a href="#platform" className="hover:text-white transition-colors">{isArabic ? l.ar : l.en}</a></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
                {isArabic ? 'الشركة' : 'Company'}
              </h4>
              <ul className="space-y-3 text-white/80 text-xs">
                {[
                  { ar: 'الأسعار', en: 'Pricing', href: '#pricing' },
                  { ar: 'الأسئلة الشائعة', en: 'FAQ', href: '#faq' },
                  { ar: 'تواصل معنا', en: 'Contact Us', href: '#contact' },
                ].map((l, i) => (
                  <li key={i}><a href={l.href} className="hover:text-white transition-colors">{isArabic ? l.ar : l.en}</a></li>
                ))}
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">
                {isArabic ? 'الأمان والخصوصية' : 'Security & Privacy'}
              </h4>
              <div className="space-y-3 text-white/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">lock</span>
                  <span>{isArabic ? 'بياناتك مشفرة أثناء النقل والتخزين' : 'Data encrypted in transit and at rest'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">privacy_tip</span>
                  <span>{isArabic ? 'لا نبيع بياناتك أو بيانات مرضاك' : 'We never sell your or your patients\' data'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-primary-container">credit_card_off</span>
                  <span>{isArabic ? 'المدفوعات عبر بوابة دفع آمنة خارجية' : 'Payments via secure third-party gateway'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-white/60 text-xs">
            <p>© 2026 SBR AI Systems. {isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
            <div className="flex gap-6">
              <Link to="/terms" className="hover:text-white transition-colors">{isArabic ? 'الشروط والأحكام' : 'Terms of Service'}</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
              <Link to="/refund-policy" className="hover:text-white transition-colors">{isArabic ? 'سياسة الاسترجاع' : 'Refund Policy'}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
