import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { useApp } from '../context/AppContext';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, activateSubscription, mergedPlans } = useApp();
  const { lang, setLang, t, isArabic } = useLanguage();
  let planId = searchParams.get('plan') || 'starter';
  if (currentUser && currentUser.role === 'doctor' && planId === 'free') {
    planId = 'starter';
  }

  // State for form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0); // 0: input, 1: connecting, 2: securing, 3: success

  // Find the selected plan from plans.js
  const selectedPlan = mergedPlans.find(p => p.id === planId) || mergedPlans[1]; // Fallback to starter

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formattedValue);
  };

  // Format Expiry Date (adds slash after MM)
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  // Format CVV (max 3 digits)
  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  // Handle Plan selection change
  const handlePlanChange = (newPlanId) => {
    setSearchParams({ plan: newPlanId });
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    const isFree = selectedPlan.id === 'free';
    if (!isFree) {
      if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
        alert(isArabic ? 'الرجاء إدخال بيانات بطاقة صحيحة وكاملة.' : 'Please enter valid and complete card details.');
        return;
      }
    }

    setIsProcessing(true);
    setProcessStep(1);

    // Step 1: Connecting (1s)
    setTimeout(() => {
      setProcessStep(2);
      // Step 2: Securing (1s)
      setTimeout(() => {
        setProcessStep(3);
        
        // Check if user is logged in
        if (currentUser && currentUser.role === 'doctor') {
          const planMap = {
            'free': 'Free Trial',
            'starter': 'SBR AI Starter',
            'pro': 'SBR AI Pro',
            'business': 'SBR AI Business',
            'enterprise': 'SBR AI Enterprise'
          };
          const planName = planMap[selectedPlan.id] || 'SBR AI Starter';
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          
          activateSubscription(currentUser.id, planName, expiryDate.toISOString().split('T')[0])
            .then(() => {
              setTimeout(() => {
                navigate('/subscription');
              }, 1500);
            })
            .catch((err) => {
              console.error(err);
              alert(isArabic ? 'حدث خطأ أثناء تجديد الاشتراك.' : 'Failed to renew subscription.');
              setIsProcessing(false);
              setProcessStep(0);
            });
        } else {
          // Save plan context in sessionStorage
          sessionStorage.setItem('paidPlan', selectedPlan.id);
          // Step 3: Success redirect (1.5s)
          setTimeout(() => {
            navigate('/register?role=doctor');
          }, 1500);
        }
      }, 1000);
    }, 1000);
  };

  const planName = isArabic ? selectedPlan.nameAr : selectedPlan.nameEn;
  const planPrice = isArabic ? `${selectedPlan.priceAr} ${selectedPlan.currencyAr}` : `${selectedPlan.priceEn} ${selectedPlan.currencyEn}`;
  const planFeatures = isArabic ? selectedPlan.featuresAr : selectedPlan.featuresEn;

  return (
    <div 
      className={`min-h-screen bg-bg-canvas font-body-md py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-between ${
        isArabic ? 'rtl text-right' : 'ltr text-left'
      }`}
    >
      {/* Background Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>

      {/* Header logo */}
      <header className="max-w-6xl mx-auto w-full mb-8 flex justify-between items-center relative z-10">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-sm font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isArabic ? 'arrow_forward' : 'arrow_back'}
          </span>
          {isArabic ? 'العودة للرئيسية' : 'Back to Home'}
        </button>
        
        <div className="flex items-center gap-4">
          <SbrLogo size={36} color="#24564C" showText={true} textClass="text-primary" />
        </div>
      </header>

      {/* Main Checkout Container */}
      <main className="max-w-5xl mx-auto w-full bg-white border border-border-subtle rounded-2xl shadow-ambient overflow-hidden relative z-10 flex flex-col md:flex-row">
        
        {/* Left Column: Form details */}
        <section className={`w-full md:w-3/5 p-8 border-b md:border-b-0 border-border-subtle ${isArabic ? 'md:border-l' : 'md:border-r'}`}>
          {selectedPlan.id === 'free' ? (
            <div className="flex flex-col justify-between h-full space-y-6 text-start">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-full uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[12px] fill">event_available</span>
                  {isArabic ? 'باقة مجانية بالكامل' : '100% Free Plan'}
                </span>
                <h1 className="text-2xl font-bold text-primary font-headline-md">
                  {isArabic ? 'تفعيل التجربة المجانية' : 'Activate Free Trial'}
                </h1>
                <p className="text-xs text-secondary mt-1">
                  {isArabic ? 'ابدأ تجربتك فوراً دون الحاجة لإدخال أي بطاقة ائتمانية.' : 'Start your trial immediately without entering any credit card details.'}
                </p>

                <div className="mt-8 p-5 bg-primary-light/30 border border-primary/10 rounded-2xl flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary text-3xl shrink-0 mt-0.5">verified_user</span>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-primary text-sm">
                      {isArabic ? 'لا توجد التزامات مالية' : 'Zero Financial Commitment'}
                    </h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {isArabic 
                        ? 'لن يتم محاسبتك أو طلب أي وسيلة دفع طوال فترة التجربة المجانية. ستحصل على 60 دقيقة من الذكاء الاصطناعي السريري لتجربة النظام بالكامل.'
                        : 'You will not be billed or asked for any payment method during the free trial. You will receive 60 minutes of clinical AI credit to fully explore the system.'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-secondary">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    <span>{isArabic ? 'تفعيل فوري للحساب الطيبي' : 'Instant medical account activation'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-secondary">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    <span>{isArabic ? 'كافة المزايا والخصائص متضمنة' : 'All standard features included'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-secondary">
                    <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                    <span>{isArabic ? 'إلغاء أو ترقية في أي وقت' : 'Upgrade or cancel anytime'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => handleSubmit()}
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-on-primary font-semibold py-3 px-4 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                  {isArabic ? 'تفعيل الفترة التجريبية والبدء (مجاناً)' : 'Activate Free Trial & Start (Free)'}
                </button>

                <div className="mt-6 pt-6 border-t border-border-subtle flex items-center justify-center gap-2 text-[10px] text-secondary font-semibold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-green-600">security</span>
                  {isArabic ? 'نظام آمن ومتوافق بالكامل مع HIPAA' : 'Fully secure & HIPAA compliant environment'}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-primary font-headline-md">
                  {isArabic ? 'تفاصيل الدفع' : 'Payment Details'}
                </h1>
                <p className="text-xs text-secondary mt-1">
                  {isArabic ? 'أكمل معاملتك باستخدام بطاقة الائتمان الخاصة بك.' : 'Complete your transaction using a credit card.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'اسم حامل البطاقة' : 'Cardholder Name'}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isProcessing}
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder={isArabic ? 'د. أحمد حسن' : 'Dr. Ahmed Hassan'}
                    className="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    {isArabic ? 'رقم البطاقة' : 'Card Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={isProcessing}
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4000 1234 5678 9010"
                      className={`w-full py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${
                        isArabic ? 'pl-10 pr-3' : 'pl-3 pr-10'
                      }`}
                    />
                    <span className={`material-symbols-outlined absolute top-1/2 transform -translate-y-1/2 text-secondary text-[20px] ${
                      isArabic ? 'left-3' : 'right-3'
                    }`}>
                      credit_card
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isProcessing}
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      {isArabic ? 'رمز التحقق (CVV / CVC)' : 'CVV / CVC'}
                    </label>
                    <input
                      type="password"
                      required
                      disabled={isProcessing}
                      value={cardCvv}
                      onChange={handleCvvChange}
                      onFocus={() => setIsFlipped(true)}
                      onBlur={() => setIsFlipped(false)}
                      placeholder="•••"
                      className="w-full px-3 py-2.5 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-on-primary font-semibold py-3 px-4 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-2 mt-8 text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  {isArabic ? `تفويض الدفع (${planPrice})` : `Authorize Payment (${planPrice})`}
                </button>
              </form>

              {/* PCI Compliance / Security Badges */}
              <div className="mt-8 pt-6 border-t border-border-subtle flex flex-wrap gap-4 items-center justify-between text-[10px] text-secondary font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-green-600">lock_open</span>
                  {isArabic ? 'متوافق مع PCI-DSS' : 'PCI-DSS Compliant'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-green-600">verified_user</span>
                  {isArabic ? 'نظام الأمان ثلاثي الأبعاد نشط' : '3D Secure Active'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-green-600">encrypted</span>
                  {isArabic ? 'تشفير AES-256' : 'AES-256 Encrypted'}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right Column: Interactive card and Plan summary */}
        <section className="w-full md:w-2/5 p-8 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-secondary tracking-widest uppercase mb-6">
              {isArabic ? 'ملخص الطلب' : 'Order Summary'}
            </h2>
            
            {/* Visual Credit Card Preview */}
            <div className="relative w-full max-w-[320px] aspect-[1.58/1] mx-auto mb-8 perspective-1000">
              <div className={`relative w-full h-full duration-700 transform-style-3d shadow-lg rounded-2xl text-white ${isFlipped ? 'rotate-y-180' : ''}`}>
                
                {/* Front Side */}
                <div className="absolute w-full h-full backface-hidden bg-gradient-to-tr from-primary to-primary-hover p-6 rounded-2xl flex flex-col justify-between border border-white/10 overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                  
                  {/* Card logo & chip */}
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-8 bg-amber-400/20 border border-amber-400/30 rounded-lg flex items-center justify-center overflow-hidden">
                      {/* Chip stripes */}
                      <div className="grid grid-cols-3 gap-0.5 w-6 h-5 opacity-80">
                        <div className="border-r border-b border-amber-400/50"></div>
                        <div className="border-r border-b border-amber-400/50"></div>
                        <div className="border-b border-amber-400/50"></div>
                        <div className="border-r border-amber-400/50"></div>
                        <div className="border-r border-amber-400/50"></div>
                        <div></div>
                      </div>
                    </div>
                    <span className="text-xs font-black tracking-widest opacity-80 italic">VISA</span>
                  </div>

                  {/* Card Number */}
                  <div className="text-lg font-mono tracking-widest text-center my-3 text-white/95 ltr">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  {/* Cardholder & Expiry */}
                  <div className="flex justify-between items-end font-mono">
                    <div className="text-left max-w-[170px]">
                      <span className="block text-[8px] text-white/50 uppercase tracking-wider">Cardholder</span>
                      <span className="block text-xs uppercase truncate max-w-[160px] font-bold">
                        {cardName || 'Cardholder Name'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-white/50 uppercase tracking-wider">Expires</span>
                      <span className="block text-xs font-bold">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-gradient-to-tr from-primary to-primary-hover py-6 rounded-2xl flex flex-col justify-between border border-white/10">
                  <div className="w-full h-10 bg-on-surface/90 my-2"></div>
                  
                  <div className="px-6 my-2">
                    <span className="block text-[8px] text-white/50 uppercase tracking-wider mb-1 text-left">Signature / CVV</span>
                    <div className="flex items-center bg-white/25 rounded-md p-1.5 h-8 justify-end">
                      <span className="font-mono text-sm tracking-wider font-bold italic mr-2 text-white/80"></span>
                      <span className="bg-white text-primary font-mono text-xs px-2 py-0.5 rounded font-black shadow-inner">
                        {cardCvv || '•••'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="px-6 text-[8px] text-white/40 leading-normal text-left font-mono">
                    This card is processed secure and tokenized. Subject to terms of SBR Clinical Systems.
                  </div>
                </div>

              </div>
            </div>

            {/* Plan Selector Grid */}
            <div className="space-y-3 mb-6 text-start">
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                {isArabic ? 'باقة الاشتراك المتاحة:' : 'Selected Subscription Plan:'}
              </label>
              <div className="space-y-2">
                {(() => {
                  const plansToShow = currentUser && currentUser.role === 'doctor'
                    ? mergedPlans.filter(p => p.id !== 'free')
                    : mergedPlans;
                  return plansToShow.map((plan) => {
                    const isSelected = plan.id === planId;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePlanChange(plan.id)}
                        className={`w-full p-3.5 rounded-xl border text-start flex items-center justify-between transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'border-primary bg-primary/[0.03] shadow-sm ring-1 ring-primary' 
                            : 'border-border-subtle bg-white hover:border-primary-light hover:bg-bg-canvas'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'border-primary bg-primary' : 'border-outline-variant'
                          }`}>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-primary">
                              {isArabic ? plan.nameAr : plan.nameEn}
                            </p>
                            <p className="text-[10px] text-secondary mt-0.5">
                              {plan.id === 'free' 
                                ? (isArabic ? '60 دقيقة مجانية' : '60 free minutes')
                                : (isArabic ? `${plan.minutes} دقيقة شهرياً` : `${plan.minutes} mins/month`)}
                            </p>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="font-extrabold text-sm text-primary">
                            {plan.price} {isArabic ? plan.currencyAr : plan.currencyEn}
                          </span>
                          <span className="text-[9px] text-secondary block">
                            {plan.id === 'free' ? '' : (isArabic ? '/شهرياً' : '/mo')}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Plan details list */}
            <div className="bg-white border border-border-subtle rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="font-bold text-primary text-sm">{planName}</h3>
                  <span className="text-[10px] text-secondary">
                    {isArabic ? 'ترخيص الطبيب الفردي' : 'Individual Clinician License'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary text-sm">{planPrice}</span>
                  <span className="text-[10px] text-secondary block">/{isArabic ? 'شهر' : 'month'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-[10px] font-black text-secondary tracking-wider uppercase mb-1">
                  {isArabic ? 'يتضمن:' : 'Includes:'}
                </span>
                {planFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-secondary">
                    <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="mt-8 text-center text-[10px] text-secondary">
            {isArabic 
              ? 'سيتجدد اشتراكك تلقائياً في نفس اليوم من كل شهر. يمكنك الإلغاء في أي وقت.' 
              : 'Your billing cycle will renew automatically on the same day every month. Cancel anytime.'}
          </div>
        </section>

      </main>

      {/* Footer copyright */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-secondary mt-8">
        {isArabic 
          ? '© 2026 مساعد SBR الذكي. جميع الحقوق محفوظة. متوافق مع نظام الحماية HIPAA ولائحة GDPR.'
          : '© 2026 SBR AI Assistant. All rights reserved. HIPAA Secure & GDPR Compliant.'}
      </footer>

      {/* Payment Processing overlay modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center border border-border-subtle shadow-ambient relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
            
            {processStep === 1 && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
                <h3 className="text-md font-bold text-primary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'جاري تهيئة الفترة التجريبية...' : 'Initializing free trial...')
                    : (isArabic ? 'جاري الاتصال ببوابة الدفع...' : 'Contacting Payment Gateway...')
                  }
                </h3>
                <p className="text-xs text-secondary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'جاري إنشاء مساحة عمل تجريبية آمنة.' : 'Creating a secure trial workspace.')
                    : (isArabic ? 'جاري الاتصال الآمن مع البنك الخاص بك للتحقق من بيانات البطاقة.' : 'Connecting securely with your bank to verify card details.')
                  }
                </p>
              </div>
            )}

            {processStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary border-t-2"></div>
                </div>
                <h3 className="text-md font-bold text-primary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'تأمين الحساب الطبي...' : 'Securing clinical account...')
                    : (isArabic ? 'تأمين المعاملة...' : 'Securing Transaction...')
                  }
                </h3>
                <p className="text-xs text-secondary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'جاري إعداد صلاحيات الأمان والامتثال لـ HIPAA.' : 'Setting up security permissions and HIPAA compliance.')
                    : (isArabic ? 'جاري تشفير بيانات الدفع والتحقق من جلسة SSL الآمنة.' : 'Tokenizing payment tokens and verifying secure SSL session.')
                  }
                </p>
              </div>
            )}

            {processStep === 3 && (
              <div className="space-y-4 animate-scale-up">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center border border-primary/20 text-primary">
                    <span className="material-symbols-outlined text-[32px] animate-pulse">check</span>
                  </div>
                </div>
                <h3 className="text-md font-bold text-primary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'تم تفعيل التجربة بنجاح!' : 'Trial Activated Successfully!')
                    : (isArabic ? 'تم تفويض عملية الدفع بنجاح!' : 'Payment Authorized!')
                  }
                </h3>
                <p className="text-xs text-secondary">
                  {selectedPlan.id === 'free'
                    ? (isArabic ? 'تم إعداد خطة التجربة المجانية بنجاح. يتم تحويلك الآن للتسجيل...' : 'Your free trial has been set up. Redirecting to registration...')
                    : (isArabic ? `عملية دفع ${planPrice} تمت بنجاح. يتم تحويلك الآن لإتمام التسجيل...` : `Your payment of ${planPrice} was successful. Redirecting to workspace registration...`)
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
