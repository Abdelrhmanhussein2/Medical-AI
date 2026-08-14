import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function HelpPage() {
  const { isArabic, lang, setLang } = useLanguage();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketType, setTicketType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successTicket, setSuccessTicket] = useState(null);

  const sections = [
    {
      titleAr: '1. البدء السريع وتفعيل الحساب',
      titleEn: '1. Quick Start and Activation',
      bodyAr: `كيف أبدأ باستخدام مساعد مِسْبَار؟
يمكنك البدء باتباع الخطوات البسيطة التالية:
• قم بإنشاء حساب جديد كطبيب أو منظمة.
• اختر الباقة المناسبة لك، أو ابدأ مباشرة بفترة التجربة المجانية التي تمنحك 60 دقيقة.
• توجه إلى لوحة التحكم لبدء جلسة تسجيل جديدة.`,
      bodyEn: `How do I start using Misbar?
You can begin by following these simple steps:
• Register a new account as a doctor or organization.
• Choose the plan that suits you, or start immediately with the 60-minute Free Trial.
• Go to your dashboard to start a new recording session.`,
    },
    {
      titleAr: '2. ميزة التدوين الذكي (دوّن)',
      titleEn: '2. Smart Dictation (Dawwen)',
      bodyAr: `تتيح لك ميزة "دوّن" تسجيل الاستشارة الطبية بشكل طبيعي ومحيطي دون تدخل يدوي. 
يستمع الذكاء الاصطناعي في الخلفية ويحلل الحوار بينك وبين المراجع، ثم يقوم تلقائياً بصياغة ملخص طبي كامل، ملخص موجه للمراجع، وملاحظات طبية منظمة.`,
      bodyEn: `The "Dawwen" feature allows you to record medical consultations ambiently and naturally without manual entry.
The AI listens in the background and analyzes the dialogue between you and the reviewer, automatically drafting a complete medical summary, a patient-friendly summary, and structured SOAP notes.`,
    },
    {
      titleAr: '3. إدارة وتعديل الملفات الطبية للمراجعين',
      titleEn: '3. Managing and Editing Reviewer Medical Profiles',
      bodyAr: `يمكنك الوصول إلى سجل المراجعين من قائمة "المراجعين" في شريط التنقل.
تتيح لك المنصة:
• تعديل الملاحظات الطبية وملخصات الزيارات.
• كتابة وتحديث التاريخ المرضي والملخص العام لكل مراجع.
• الاطلاع على سجل الزيارات التاريخي ومراجعة التسجيلات والملخصات السابقة في أي وقت.`,
      bodyEn: `You can access reviewer records from the "Reviewers" menu in the navigation bar.
The platform allows you to:
• Edit medical summaries and visit notes.
• Write and update the general summary and medical history for each reviewer.
• View historical visit logs and review past recordings and summaries at any time.`,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessTicket(null);

    try {
      const res = await fetch('/api/v1/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          ticket_type: ticketType,
          message
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessTicket(data.ticket_number);
        // Clear form
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || (isArabic ? 'فشل إرسال الطلب، يرجى المحاولة لاحقاً.' : 'Failed to submit request.'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-bg-canvas font-body-md text-right">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-border-subtle">
        <div className="max-w-container-max mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <SbrLogo size={32} color="#24564C" showText={true} textClass="text-primary" />
          </Link>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">language</span>
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-8">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-xs text-primary font-bold tracking-wider uppercase mb-2">
            {isArabic ? 'مركز الدعم والمساعدة' : 'Help & Support Center'}
          </p>
          <h1 className="text-3xl font-display-lg font-black text-on-surface leading-tight">
            {isArabic ? 'مركز مساعدة مِسْبَار' : 'SBR AI Help Center'}
          </h1>
          <p className="text-secondary text-sm mt-3 leading-relaxed">
            {isArabic
              ? 'مرحباً بك في مركز المساعدة. تصفح أدلة الاستخدام السريعة أو أرسل اقتراحاتك وشكاواك مباشرة لفريق الدعم.'
              : 'Welcome to our Help Center. Browse quick guides or submit your suggestions and complaints directly to our support team.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left/Main Column: Guides */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className={`text-lg font-bold text-on-surface mb-4 flex items-center gap-2 ${isArabic ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
              <span className="material-symbols-outlined text-primary text-[22px]">import_contacts</span>
              {isArabic ? 'أدلة الاستخدام والإرشاد' : 'User Guides & Tutorials'}
            </h2>
            
            <div className="space-y-6 text-right" dir={isArabic ? 'rtl' : 'ltr'}>
              {sections.map((sec, i) => (
                <div key={i} className="bg-white border border-border-subtle rounded-xl p-5 shadow-sm">
                  <h3 className="font-headline-md text-sm text-primary font-black mb-2.5">
                    {isArabic ? sec.titleAr : sec.titleEn}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {isArabic ? sec.bodyAr : sec.bodyEn}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Suggestions & Complaints Form */}
          <div className="lg:col-span-5 bg-white border border-border-subtle rounded-2xl p-6 shadow-sm text-right" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 border-b border-border-subtle pb-4 mb-4">
              <span className="material-symbols-outlined text-primary text-[22px]">rate_review</span>
              <h2 className="text-base font-black text-secondary">
                {isArabic ? 'الاقتراحات والشكاوى' : 'Suggestions & Complaints'}
              </h2>
            </div>

            {successTicket ? (
              <div className="bg-primary-light/40 border border-primary/20 p-5 rounded-xl text-center space-y-4 animate-fade-in">
                <span className="material-symbols-outlined text-primary text-[48px] block">check_circle</span>
                <h3 className="text-base font-black text-primary">
                  {isArabic ? 'تم إرسال طلبك بنجاح!' : 'Submitted Successfully!'}
                </h3>
                <div className="bg-white border border-border-subtle p-4 rounded-lg inline-block">
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">
                    {isArabic ? 'رقم التيكت التلقائي' : 'Auto Ticket Number'}
                  </p>
                  <p className="text-lg font-mono font-black text-secondary mt-1">{successTicket}</p>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {isArabic 
                    ? 'لقد تم فتح تيكت دعم فني برقم تلقائي، وتم إرسال نسخة من الطلب إلى بريدك الإلكتروني ونسخة للإدارة لمراجعتها.' 
                    : 'A support ticket has been opened, and copies have been dispatched to both your email and the admin.'}
                </p>
                <button
                  onClick={() => setSuccessTicket(null)}
                  className="w-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {isArabic ? 'تقديم طلب جديد' : 'Submit Another Request'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-right">
                {error && (
                  <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">
                    {isArabic ? 'الاسم الكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={isArabic ? 'الاسم الثنائي أو الثلاثي' : 'John Doe'}
                    className="w-full px-3.5 py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">
                      {isArabic ? 'البريد الإلكتروني *' : 'Email Address *'}
                    </label>
                    <input
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="w-full px-3.5 py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-left"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">
                      {isArabic ? 'رقم الجوال *' : 'Mobile Number *'}
                    </label>
                    <input
                      type="text" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0501234567"
                      className="w-full px-3.5 py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-left"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">
                    {isArabic ? 'نوع الطلب *' : 'Request Type *'}
                  </label>
                  <select
                    value={ticketType} onChange={(e) => setTicketType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                  >
                    <option value="suggestion">{isArabic ? 'اقتراح وتطوير' : 'Suggestion & Feedback'}</option>
                    <option value="complaint">{isArabic ? 'شكوى أو بلاغ' : 'Complaint'}</option>
                    <option value="inquiry">{isArabic ? 'استفسار عام' : 'General Inquiry'}</option>
                    <option value="technical">{isArabic ? 'مشكلة تقنية / عطل' : 'Technical Issue'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">
                    {isArabic ? 'تفاصيل الطلب / الرسالة *' : 'Message / Details *'}
                  </label>
                  <textarea
                    required value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder={isArabic ? 'اكتب هنا اقتراحك أو تفاصيل الشكوى بالتفصيل...' : 'Type details here...'}
                    rows="5"
                    className="w-full px-3.5 py-2 bg-bg-canvas border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary font-bold text-xs py-2.5 rounded-lg transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                      {isArabic ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      {isArabic ? 'إرسال الطلب' : 'Submit Request'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            <span className="material-symbols-outlined text-[18px]">{isArabic ? 'arrow_forward' : 'arrow_back'}</span>
            {isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </main>
    </div>
  );
}
