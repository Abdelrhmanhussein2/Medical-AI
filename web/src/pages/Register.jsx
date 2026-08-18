import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PLANS } from '../data/plans';
import { EHR_SYSTEMS } from '../data/ehr_systems';
import SbrLogo from '../components/SbrLogo';
import SearchableSelect from '../components/SearchableSelect';
import SpecialtyInput from '../components/SpecialtyInput';


const COUNTRIES = [
  // Most Used / Defaults
  { code: 'EG', nameAr: 'مصر', nameEn: 'Egypt', prefix: '+20', defaultPhone: '+201012345678' },
  // GCC
  { code: 'SA', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', prefix: '+966', defaultPhone: '+966501234567' },
  { code: 'AE', nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates', prefix: '+971', defaultPhone: '+971501234567' },
  { code: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', prefix: '+965', defaultPhone: '+96550123456' },
  { code: 'QA', nameAr: 'قطر', nameEn: 'Qatar', prefix: '+974', defaultPhone: '+97450123456' },
  { code: 'OM', nameAr: 'عمان', nameEn: 'Oman', prefix: '+968', defaultPhone: '+96890123456' },
  { code: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', prefix: '+973', defaultPhone: '+97330123456' },
  // Levant & Iraq
  { code: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', prefix: '+962', defaultPhone: '+962701234567' },
  { code: 'PS', nameAr: 'فلسطين', nameEn: 'Palestine', prefix: '+970', defaultPhone: '+970591234567' },
  { code: 'LB', nameAr: 'لبنان', nameEn: 'Lebanon', prefix: '+961', defaultPhone: '+9613123456' },
  { code: 'SY', nameAr: 'سوريا', nameEn: 'Syria', prefix: '+963', defaultPhone: '+963912345678' },
  { code: 'IQ', nameAr: 'العراق', nameEn: 'Iraq', prefix: '+964', defaultPhone: '+9647012345678' },
  // North Africa
  { code: 'MA', nameAr: 'المغرب', nameEn: 'Morocco', prefix: '+212', defaultPhone: '+212612345678' },
  { code: 'DZ', nameAr: 'الجزائر', nameEn: 'Algeria', prefix: '+213', defaultPhone: '+213512345678' },
  { code: 'TN', nameAr: 'تونس', nameEn: 'Tunisia', prefix: '+216', defaultPhone: '+21651234567' },
  { code: 'LY', nameAr: 'ليبيا', nameEn: 'Libya', prefix: '+218', defaultPhone: '+218912345678' },
  { code: 'SD', nameAr: 'السودان', nameEn: 'Sudan', prefix: '+249', defaultPhone: '+249912345678' },
  // East Africa & Yemen
  { code: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', prefix: '+967', defaultPhone: '+967701234567' },
  { code: 'SO', nameAr: 'الصومال', nameEn: 'Somalia', prefix: '+252', defaultPhone: '+25261234567' },
  { code: 'DJ', nameAr: 'جيبوتي', nameEn: 'Djibouti', prefix: '+253', defaultPhone: '+25377123456' },
  { code: 'MR', nameAr: 'موريتانيا', nameEn: 'Mauritania', prefix: '+222', defaultPhone: '+22241234567' },
  { code: 'KM', nameAr: 'جزر القمر', nameEn: 'Comoros', prefix: '+269', defaultPhone: '+2693212345' },
  { code: 'OTHER', nameAr: 'أخرى', nameEn: 'Other', prefix: '+', defaultPhone: '+12025550143' }
];

export default function Register({ setActivePage }) {
  const { registerDoctor, registerOrg, activateSubscription } = useApp();
  const { lang, setLang, t, isArabic } = useLanguage();
  const paidPlan = sessionStorage.getItem('selectedPlan') || sessionStorage.getItem('paidPlan');
  const [role, setRole] = useState('doctor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('SA');
  const [phone, setPhone] = useState('');

  const countryOptions = COUNTRIES.map((c) => ({
    value: c.code,
    label: isArabic ? c.nameAr : c.nameEn,
    sublabel: c.prefix
  }));

  const ehrOptions = EHR_SYSTEMS.map((ehr) => ({
    value: ehr,
    label: ehr
  }));

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [ehrSystem, setEhrSystem] = useState('');
  const [ehrOther, setEhrOther] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreePrivacy) {
      setError(isArabic
        ? 'يجب الموافقة على سياسة الخصوصية وشروط الاستخدام للمتابعة'
        : 'You must agree to the Privacy Policy and Terms of Service to proceed');
      return;
    }

    let finalPhone = phone.trim();
    const country = COUNTRIES.find(c => c.code === selectedCountry);
    if (country && !finalPhone.startsWith('+')) {
      if (finalPhone.startsWith('0')) {
        finalPhone = country.prefix + finalPhone.slice(1);
      } else {
        finalPhone = country.prefix + finalPhone;
      }
    }

    if (role === 'doctor') {
      try {
        const finalEhr = ehrSystem === 'Other' ? (ehrOther.trim() || 'Other') : (ehrSystem || null);
        const newDoc = await registerDoctor(name, email, finalPhone, password, specialty, null, 'pending', null, finalEhr);
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
        await registerOrg(name, email, finalPhone, specialty, password);
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
            <SbrLogo size={56} color="#006973" showText={true} textClass="text-primary" />

            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-primary font-headline-lg leading-tight">
                {role === 'doctor'
                  ? (isArabic ? 'انضم لمجتمع أطباء SBR AI' : 'Join the SBR AI Clinician Community')
                  : (isArabic ? 'مكّن فرقك' : 'Empower Your Clinical Teams')}
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                {role === 'doctor'
                  ? (isArabic
                    ? 'سجّل مساحة عملك لتبدأ استخدام مساعدي الذكاء الاصطناعي، وتوثيق الزيارات الطبية تلقائياً.'
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
                    ? 'نتحقق من بيانات الاعتماد الطبية للتحقق من المستخدمين وتأمين مساحة العمل.'
                    : 'We require medical credential checks to verify clinical users and secure the workspace.')
                  : (isArabic
                    ? 'إدارة الأقسام وتوزيع المقاعد وتحليلات تحويل الكلام إلى نص الخاصة بالذكاء الاصطناعي.'
                    : 'Easily manage clinical departments, seat distributions, and AI transcription analytics.')}
              </p>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-6 md:py-12 px-6 sm:px-12 lg:px-24 bg-white overflow-y-auto relative">
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
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="mb-4 lg:hidden">
                <SbrLogo size={44} color="#006973" showText={true} textClass="text-primary" />
              </div>
              <h2 className="font-display-lg text-2xl md:text-3xl text-primary font-bold">
                {role === 'doctor'
                  ? (isArabic ? 'تسجيل طبيب' : 'Register Doctor')
                  : (isArabic ? 'تسجيل منظمة' : 'Register Organization')}
              </h2>
              <p className="mt-1 text-sm md:text-base text-secondary text-center">
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
                    onClick={() => {
                      setRole(key);
                      setName('');
                      setEmail('');
                      setPhone('');
                      setEhrSystem('');
                      setEhrOther('');
                      setError('');
                    }}
                    type="button"
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${role === key ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
                      }`}
                  >
                    {isArabic ? ar : en}
                  </button>
                ))}
              </div>

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
                  <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {role === 'doctor'
                      ? (isArabic ? 'الاسم الكامل' : 'Full Name')
                      : (isArabic ? 'اسم المنظمة' : 'Organization Name')}
                  </label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'doctor' ? (isArabic ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan') : 'Saudi Medical Group'}
                    className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? 'البريد الإلكتروني' : (role === 'doctor' ? 'Email Address' : 'Organization Email')}
                  </label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'doctor' ? 'doctor@example.com' : 'org@saudimed.com'}
                    className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? 'الدولة' : 'Country'}
                  </label>
                  <SearchableSelect
                    options={countryOptions}
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    placeholder={isArabic ? '-- اختر الدولة --' : '-- Select Country --'}
                    searchPlaceholder={isArabic ? 'ابحث عن دولة...' : 'Search country...'}
                    isArabic={isArabic}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder={COUNTRIES.find(c => c.code === selectedCountry)?.prefix + '1012345678'}
                    className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ltr text-left`}
                    dir="ltr"
                  />
                </div>

                <SpecialtyInput
                  value={specialty}
                  onChange={setSpecialty}
                  isArabic={isArabic}
                  required
                  label={
                    role === 'doctor'
                      ? (isArabic ? 'التخصص الطبي' : 'Specialization')
                      : (isArabic ? 'التخصص / القسم' : 'Specialty / Clinical Department')
                  }
                />

                {role === 'doctor' && (
                  <div>
                    <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                      {isArabic ? 'نظام السجل الطبي الإلكتروني (EHR)' : 'Electronic Health Record (EHR) System'}
                    </label>
                    <SearchableSelect
                      options={ehrOptions}
                      value={ehrSystem}
                      onChange={(val) => { setEhrSystem(val); setEhrOther(''); }}
                      placeholder={isArabic ? '-- اختر النظام --' : '-- Select EHR --'}
                      searchPlaceholder={isArabic ? 'ابحث عن نظام...' : 'Search system...'}
                      isArabic={isArabic}
                    />
                    {ehrSystem === 'Other' && (
                      <input
                        type="text"
                        value={ehrOther}
                        onChange={(e) => setEhrOther(e.target.value)}
                        placeholder={isArabic ? 'اكتب اسم النظام...' : 'Type your EHR system name...'}
                        className={`mt-2 w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ltr text-left`}
                        dir="ltr"
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? 'كلمة المرور' : 'Password'}
                  </label>
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface`}
                  />
                </div>



                {/* Privacy Policy Agreement Checkbox */}
                <div className="flex items-start gap-2.5 mt-5" dir={isArabic ? 'rtl' : 'ltr'}>
                  <input
                    type="checkbox"
                    id="privacy-agree"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary focus:ring-2 cursor-pointer accent-primary shrink-0"
                    required
                  />
                  <label htmlFor="privacy-agree" className={`text-xs text-on-surface-variant leading-relaxed select-none ${isArabic ? 'text-right' : 'text-left'}`}>
                    {isArabic ? (
                      <>
                        أوافق على{' '}
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-primary hover:underline font-bold inline-block p-0 m-0 bg-transparent border-none align-baseline"
                        >
                          سياسة الخصوصية وسرية البيانات الطبية
                        </button>{' '}
                        وشروط الاستخدام الخاصة بـ SBR AI.
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-primary hover:underline font-bold inline-block p-0 m-0 bg-transparent border-none align-baseline"
                        >
                          Privacy Policy &amp; Medical Data Agreement
                        </button>{' '}
                        and Terms of Service.
                      </>
                    )}
                  </label>
                </div>

                <button
                  type="submit"
                  className={`w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-base ${!agreePrivacy ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  disabled={!agreePrivacy}
                >
                  {isArabic ? 'إرسال طلب التسجيل' : 'Submit Registration'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-secondary">
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

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir={isArabic ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-border-subtle shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up text-start">
            {/* Header */}
            <div className="p-5 border-b border-border-subtle bg-bg-canvas flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">shield_locked</span>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isArabic ? 'سياسة الخصوصية وسرية البيانات الطبية' : 'Privacy Policy & Medical Data'}
                </h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-start font-body-md text-sm text-on-surface-variant leading-relaxed">

              {isArabic ? (
                /* ===== ARABIC VERSION ===== */
                <div className="space-y-5" dir="rtl">
                  <p className="text-xs text-secondary">
                    آخر تحديث: 10 أغسطس 2026
                  </p>

                  {/* سياسة الخصوصية */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">shield_locked</span>
                      سياسة الخصوصية
                    </h4>
                    <div className="p-4 bg-primary-light/30 border border-primary/10 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">ما تغطيه هذه السياسة</p>
                      <p className="text-xs leading-relaxed">هذه السياسة توضح كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك لموقعنا (sbr-ai.com) واشتراكك في منصة SBR AI. تُقرأ مع سياسة الكوكيز.</p>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">البيانات التي نجمعها</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>اسمك وبيانات التواصل (البريد الإلكتروني، رقم الجوال، اسم العيادة)</li>
                        <li>عنوان IP عبر تقنية الكوكيز</li>
                        <li>بيانات حسابك وبيانات الاشتراك والفوترة</li>
                        <li>نشاطك واستخدامك للموقع والأنظمة</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">حقوقك بموجب نظام حماية البيانات الشخصية (PDPL)</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>الحق في الإعلام بالغرض والأساس القانوني للمعالجة</li>
                        <li>الحق في الوصول لنسخة من بياناتك الشخصية</li>
                        <li>الحق في تصحيح أي بيانات غير دقيقة</li>
                        <li>الحق في الحذف/الإتلاف (المادة 18 من النظام)</li>
                        <li>حق قابلية نقل البيانات بتنسيق قابل للقراءة آلياً</li>
                        <li>الحق في الاعتراض على المعالجة لأغراض محددة</li>
                        <li>سحب الموافقة في أي وقت</li>
                      </ul>
                    </div>
                  </section>

                  {/* سياسة الكوكيز */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-secondary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">cookie</span>
                      سياسة الكوكيز
                    </h4>
                    <div className="p-4 bg-tertiary-fixed/20 border border-tertiary/10 rounded-xl space-y-2">
                      <p className="text-xs leading-relaxed">نستخدم ثلاثة أنواع من الكوكيز:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li><strong>ضرورية:</strong> لتسجيل الدخول وتأمين الجلسة — دائماً نشطة</li>
                        <li><strong>تحليلية:</strong> لتحليل حركة الزوار — تحتاج موافقتك</li>
                        <li><strong>وظيفية:</strong> لتذكّر تفضيلاتك كاللغة — تحتاج موافقتك</li>
                      </ul>
                      <p className="text-xs leading-relaxed">لا نستخدم حالياً كوكيز إعلانية أو تسويقية. يمكنك إدارة موافقتك في أي وقت.</p>
                    </div>
                  </section>

                  {/* شروط الاستخدام */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-on-surface flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">gavel</span>
                      شروط الاستخدام
                    </h4>
                    <div className="p-4 bg-error-container/20 border border-error/10 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-error">إخلاء المسؤولية الطبية (المادة 12)</p>
                      <p className="text-xs leading-relaxed">قد تحتوي مخرجات الذكاء الاصطناعي على أخطاء أو معلومات غير مكتملة. بصفتك طبيباً مرخصاً، أنت المسؤول الوحيد عن مراجعة وتدقيق كل مخرج قبل إدراجه في أي سجل طبي أو الاعتماد عليه في أي قرار سريري.</p>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-on-surface">بنود أساسية</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>يُحظر على من هم دون 18 عاماً استخدام المنصة</li>
                        <li>يحق لنا تعليق الوصول إذا تأخر السداد أكثر من 7 أيام</li>
                        <li>يُحذف الحساب الخامل لمدة 12 شهراً مع جميع بياناته</li>
                        <li>يخضع هذا الاتفاق لأنظمة المملكة العربية السعودية</li>
                        <li>للتواصل أو الاستفسارات: contact@sbr-ai.com</li>
                      </ul>
                    </div>
                  </section>

                  {/* معالجة الصوت والأمان */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      الأمان وحماية البيانات الطبية
                    </h4>
                    <div className="p-4 bg-primary-light/30 border border-primary/10 rounded-xl space-y-2">
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>تشفير كامل للمحادثات الطبية وتدمير الملفات الصوتية الخام بعد استخراج الملاحظات</li>
                        <li>لا نشارك أو نبيع المعلومات الصحية المحمية (PHI) أبداً</li>
                        <li>تشفير قاعدة البيانات بالكامل باستخدام AES-256</li>
                        <li>مساحة عملك معزولة تماماً عن باقي المستخدمين</li>
                      </ul>
                    </div>
                  </section>
                </div>
              ) : (
                /* ===== ENGLISH VERSION ===== */
                <div className="space-y-5" dir="ltr">
                  <p className="text-xs text-secondary">Last updated: August 10, 2026</p>

                  {/* Privacy Policy */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">shield_locked</span>
                      Privacy Policy
                    </h4>
                    <div className="p-4 bg-primary-light/30 border border-primary/10 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">What this policy covers</p>
                      <p className="text-xs leading-relaxed">This policy explains how we collect, use, and protect your data when you use our website (sbr-ai.com) and subscribe to the SBR AI platform. It should be read alongside our Cookie Policy.</p>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">Data we collect</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Your name and contact details (email, phone, clinic name)</li>
                        <li>IP address via cookies</li>
                        <li>Account data, subscription and billing data</li>
                        <li>Your activity and usage of the website and systems</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-on-surface">Your rights under the Personal Data Protection Law (PDPL)</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Be informed of the purpose and legal basis for processing</li>
                        <li>Access a copy of your personal data</li>
                        <li>Correction of any inaccurate data</li>
                        <li>Deletion/destruction of your data (Article 18 of the Law)</li>
                        <li>Data portability in a machine-readable format</li>
                        <li>Object to processing for specific purposes</li>
                        <li>Withdraw consent at any time</li>
                      </ul>
                    </div>
                  </section>

                  {/* Cookie Policy */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-secondary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">cookie</span>
                      Cookie Policy
                    </h4>
                    <div className="p-4 bg-tertiary-fixed/20 border border-tertiary/10 rounded-xl space-y-2">
                      <p className="text-xs leading-relaxed">We use three categories of cookies:</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li><strong>Strictly necessary:</strong> For login and session security — always active</li>
                        <li><strong>Analytics:</strong> To analyze visitor traffic — require your consent</li>
                        <li><strong>Functionality:</strong> To remember preferences like language — require your consent</li>
                      </ul>
                      <p className="text-xs leading-relaxed">We do not currently use advertising or marketing cookies. You may manage your consent at any time.</p>
                    </div>
                  </section>

                  {/* Terms of Service */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-on-surface flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">gavel</span>
                      Terms of Service
                    </h4>
                    <div className="p-4 bg-error-container/20 border border-error/10 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-error">AI-Generated Output Disclaimer (Section 12)</p>
                      <p className="text-xs leading-relaxed">AI-generated output may contain errors or omissions. As a licensed physician, you are solely responsible for reviewing and verifying every output before including it in a medical record or relying on it for any clinical decision.</p>
                    </div>
                    <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-on-surface">Key terms</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Our Services are not directed to persons under 18</li>
                        <li>We may suspend access if payment is more than 7 days overdue</li>
                        <li>Accounts inactive for 12+ months may be deleted with all associated data</li>
                        <li>This Agreement is governed by the laws of the Kingdom of Saudi Arabia</li>
                        <li>Contact us at: contact@sbr-ai.com</li>
                      </ul>
                    </div>
                  </section>

                  {/* Security */}
                  <section className="space-y-3">
                    <h4 className="font-bold text-primary flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      Security & Medical Data Protection
                    </h4>
                    <div className="p-4 bg-primary-light/30 border border-primary/10 rounded-xl space-y-2">
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>All audio consultations are encrypted; raw audio is purged after note extraction</li>
                        <li>We never share or sell Protected Health Information (PHI)</li>
                        <li>All database records are fully encrypted using AES-256</li>
                        <li>Your clinical workspace is fully isolated from other users</li>
                      </ul>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border-subtle bg-bg-canvas flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 border border-border-subtle rounded-lg text-xs font-semibold text-secondary hover:text-primary transition-colors cursor-pointer bg-white"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreePrivacy(true);
                  setShowPrivacyModal(false);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                {isArabic ? 'أوافق على الشروط والسياسة' : 'I Agree to Policy & Terms'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
