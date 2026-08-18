import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  const { isArabic, lang, setLang } = useLanguage();

  const alignmentClass = isArabic ? 'text-right' : 'text-left';
  const rtlDir = isArabic ? 'rtl' : 'ltr';
  const lastUpdated = isArabic 
    ? 'آخر تحديث: 10 أغسطس 2026' 
    : 'Last updated: August 10, 2026';

  return (
    <div dir={rtlDir} className="min-h-screen bg-[#F9FAFB] font-body-md relative pb-20">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-[#006973]/5 to-transparent pointer-events-none"></div>

      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 transition-transform active:scale-95">
            <SbrLogo size={32} color="#006973" showText={true} textClass="text-[#006973] font-black" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/privacy" 
              className="text-xs font-bold text-[#4B5563] hover:text-[#006973] transition-colors"
            >
              {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1 px-3 py-1.5 border border-[#D1D5DB] bg-white text-[#4B5563] hover:text-[#006973] hover:border-[#006973]/35 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">language</span>
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="pt-24 max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header Block */}
        <div className={`mb-8 pb-6 border-b border-[#E5E7EB] ${alignmentClass}`}>
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider text-primary bg-[#006973]/10 px-3 py-1 rounded-full mb-3">
            {lastUpdated}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight">
            {isArabic ? 'الشروط وأحكام الخدمة' : 'Terms & Conditions of Service'}
          </h1>
          <p className="text-[#6B7280] text-sm mt-2 leading-relaxed">
            {isArabic 
              ? 'يرجى قراءة شروط الخدمة بعناية قبل استخدام منصة مسبار للذكاء الاصطناعي الطبي.' 
              : 'Please read our Terms of Service carefully before utilizing the SBR Medical AI Platform.'}
          </p>
        </div>

        {/* Warning Alert banner (Medical Disclaimer) */}
        <div className={`mb-8 p-5 bg-[#ef4444]/5 border border-[#ef4444]/15 rounded-2xl flex gap-3 ${alignmentClass}`}>
          <span className="material-symbols-outlined text-[#ef4444] text-2xl shrink-0">gavel</span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#ef4444]">
              {isArabic ? 'تنبيه طبي وقانوني هام جداً (المادة 12)' : 'Critical Medical & Legal Notice (Section 12)'}
            </p>
            <p className="text-xs text-[#4B5563] leading-relaxed text-justify">
              {isArabic
                ? 'مخرجات الذكاء الاصطناعي التي تولدها المنصة (مثل الملاحظات الطبية وتقارير الزيارة) قد تحتوي على أخطاء أو معلومات غير دقيقة أو ناقصة. بصفتك طبيبًا أو ممارسًا صحيًا مرخصًا نظامًا، تقع على عاتقك المسؤولية المهنية والقانونية والشرعية الكاملة بمفردك لمراجعة وتدقيق واعتماد كل مخرج قبل إدراجه في السجل الطبي للمريض أو الاعتماد عليه في أي قرار علاجي، سريري، أو فواتير.'
                : 'AI-generated outputs (such as clinical notes and SOAP summaries) may contain errors or inaccuracies. As a licensed healthcare practitioner, you bear sole professional and legal responsibility to review, verify, edit, and approve all outputs before integrating them into medical files or relying on them for clinical decisions.'}
            </p>
          </div>
        </div>

        {/* Terms Document Body */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-10 shadow-sm">
          {isArabic ? (
            /* =========================================================================
               ======================== TERMS CONTENT (ARABIC) =========================
               ========================================================================= */
            <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
              
              {/* Section 1 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">١. من نحن</h2>
                <p>
                  تُقدم خدمات منصة مسبار (SBR AI) كأداة ذكاء اصطناعي للمساعدة في التوثيق الطبي وتنظيم سير العمل بالعيادات والمستشفيات، وتخضع الاتفاقية بالكامل للأنظمة السارية في المملكة العربية السعودية.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٢. شروط الحساب والتسجيل</h2>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                  <li>يجب أن تكون طبيباً أو ممارساً صحياً مرخصاً نظاماً في المملكة العربية السعودية، أو عيادة/منشأة طبية مرخصة للعمل في القطاع الصحي.</li>
                  <li>يلتزم العميل بالحفاظ على سرية معلومات الدخول وحماية الحساب. العميل مسؤول بالكامل عن أي أنشطة تتم من خلال حسابه.</li>
                  <li>يُمنع منعاً باتاً انتحال شخصية الغير، أو مشاركة تفاصيل الحساب أو كلمات المرور مع أي أفراد آخرين خارج المنشأة المصرح لها.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٣. سياسة الاستخدام المقبول للخدمة</h2>
                <p className="font-semibold text-xs text-[#111827]">أ. يلتزم العميل بعدم استخدام الخدمة أو السماح للغير بـ:</p>
                <ul className="list-disc list-inside space-y-1.5 pr-2 text-xs text-[#4B5563]">
                  <li>محاولة اختراق، تعطيل، أو تجاوز تدابير الحماية والأمان الخاصة بالمنصة.</li>
                  <li>تنفيذ هجمات حجب الخدمة (DDoS) أو فحص المنصة للبحث عن ثغرات بهدف استغلالها.</li>
                  <li>محاولة الهندسة العكسية للبرمجيات أو استخراج الكود المصدري للمنصة.</li>
                  <li>تجاوز حدود الاستخدام المفروضة أو استخدام المنصة لتطوير منتج منافس.</li>
                </ul>

                <p className="font-semibold text-xs text-[#111827] mt-3">ب. المحتوى والبيانات الطبية المرفوعة:</p>
                <ul className="list-disc list-inside space-y-1.5 pr-2 text-xs text-[#4B5563]">
                  <li>يتحمل الطبيب أو المنشأة الطبية المسؤولية الكاملة والشرعية عن الحصول على موافقة المرضى المسبقة قبل إجراء أي تسجيل صوتي للمحادثة الطبية وفقاً للأنظمة الطبية المعمول بها بالمملكة.</li>
                  <li>يجب ألا يحتوي المحتوى المرفوع على برمجيات ضارة، أو مواد تنتهك الملكية الفكرية، أو بيانات تم جمعها بطريقة غير قانونية.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٤. الرسوم والاشتراكات وأحكام الدفع</h2>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                  <li>يلتزم العميل بسداد رسوم الاشتراك الشهري المحددة للباقة المختارة عبر وسائل الدفع المعتمدة.</li>
                  <li>تتجدد الاشتراكات تلقائياً شهرياً في تاريخ الفوترة، ما لم يقم العميل بإلغاء التجديد من لوحة التحكم أو بمراسلتنا قبل موعد التجديد.</li>
                  <li>جميع الرسوم المدفوعة غير قابلة للاسترداد بعد بدء دورة الفوترة، باستثناء وجود خطأ تقني واضح ومثبت من جانبنا في سحب الرسوم، أو الإلغاء خلال ٢٤ ساعة من الدفع الأول دون استخدام الخدمة.</li>
                  <li>في حال عدم سداد الرسوم المستحقة وتأخر السداد لأكثر من ٧ أيام، يحق للمنصة تعليق الحساب مؤقتاً حتى يتم السداد بالكامل.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٥. ملكية البيانات وحقوق الفكرية</h2>
                <ul className="list-disc list-inside space-y-1.5 pr-2 text-xs text-[#4B5563]">
                  <li><strong className="text-[#111827]">بيانات العميل والمرضى:</strong> تظل جميع البيانات والنصوص والتسجيلات المرفوعة ملكاً خالصاً للعميل أو مرضاه. لا تكتسب المنصة أي حقوق ملكية عليها.</li>
                  <li><strong className="text-[#111827]">ملكية المنصة:</strong> جميع البرمجيات، الواجهات، التصاميم، التقنيات، والعلامات التجارية لـ SBR AI تظل ملكاً فكرياً وحصرياً للمنصة ومحمية بموجب أنظمة الملكية الفكرية في المملكة.</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٦. المسؤولية وإخلاء المسؤولية الطبية</h2>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                  <li>منصة مسبار هي أداة مساعدة لتوثيق الجلسات الطبية وتوفير الوقت للكوادر الطبية؛ وهي ليست بديلاً عن الطبيب ولا تقدم تشخيصاً طبياً أو قرارات علاجية.</li>
                  <li>لا تتحمل المنصة أي مسؤولية قانونية عن الأخطاء الطبية أو التشخيص الخاطئ أو القرارات السريرية التي يتخذها الطبيب اعتماداً على مخرجات الذكاء الاصطناعي دون مراجعة وتدقيق مهني.</li>
                  <li>العميل مسؤول قانونياً ومهنياً أمام الجهات الرقابية الطبية (مثل وزارة الصحة والهيئة السعودية للتخصصات الصحية) عن محتوى ودقة السجلات الطبية التي يعتمدها.</li>
                </ul>
              </div>

              {/* Section 7 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٧. القانون الحاكم وتسوية النزاعات</h2>
                <p>
                  تخضع هذه الشروط والأحكام وتُفسر بالكامل وفقاً للأنظمة واللوائح المعمول بها في المملكة العربية السعودية. وفي حال نشوء أي نزاع يتعذر حله ودياً، ينعقد الاختصاص القضائي الحصري للمحاكم والجهات القضائية المختصة في المملكة العربية السعودية للفصل فيه.
                </p>
              </div>

            </div>
          ) : (
            /* =========================================================================
               ======================== TERMS CONTENT (ENGLISH) ========================
               ========================================================================= */
            <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
              
              {/* Section 1 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">1. Scope of Service</h2>
                <p>
                  SBR AI provides clinical documentation assistance powered by artificial intelligence. These services are provided under the laws of the Kingdom of Saudi Arabia.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">2. Account Registration & Security</h2>
                <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#4B5563]">
                  <li>You must be a licensed healthcare practitioner or registered clinical entity in Saudi Arabia.</li>
                  <li>You are solely responsible for protecting your account credentials. Sharing passwords outside authorized staff is strictly prohibited.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">3. Acceptable Use Policy</h2>
                <p className="font-semibold text-xs text-[#111827]">You agree not to:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#4B5563]">
                  <li>Attempt to bypass security features, reverse-engineer, or audit our systems for vulnerabilities.</li>
                  <li>Upload any files containing malware, viruses, or infringing intellectual property.</li>
                  <li>Record audio consultations without acquiring proper patient consent.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">4. Fees & Payments</h2>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-[#4B5563]">
                  <li>Subscriptions renew automatically monthly unless cancelled prior to renewal date.</li>
                  <li>Paid fees are non-refundable except under confirmed billing errors or cancellation within 24 hours without service use.</li>
                  <li>We reserve the right to suspend access if fees remain unpaid for more than 7 days.</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">5. Disclaimer of Liability & Governing Law</h2>
                <p>
                  SBR AI is a support tool and does not provide medical decisions. You are solely responsible for reviewing outputs. These Terms are governed strictly by KSA law, and any disputes will fall under KSA jurisdiction.
                </p>
              </div>

            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 text-center border-t border-[#E5E7EB] pt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[#006973] font-bold text-sm hover:underline transition-all hover:gap-3">
            <span className="material-symbols-outlined text-[18px]">{isArabic ? 'arrow_forward' : 'arrow_back'}</span>
            {isArabic ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>

      </main>
    </div>
  );
}
