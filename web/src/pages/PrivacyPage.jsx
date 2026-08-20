import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const { isArabic, lang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' or 'cookies'

  const alignmentClass = isArabic ? 'text-right' : 'text-left';
  const rtlDir = isArabic ? 'rtl' : 'ltr';

  return (
    <div dir={rtlDir} className="min-h-screen bg-[#F9FAFB] font-body-md relative pb-20">
      {/* Background visual element */}
      <div className="absolute top-0 left-0 right-0 h-[280px] bg-gradient-to-b from-[#006973]/5 to-transparent pointer-events-none"></div>

      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 transition-transform active:scale-95">
            <SbrLogo size={32} color="#006973" showText={true} textClass="text-[#006973] font-black" />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              to="/terms" 
              className="text-xs font-bold text-[#4B5563] hover:text-[#006973] transition-colors"
            >
              {isArabic ? 'الشروط والأحكام' : 'Terms of Service'}
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
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider text-[#006973] bg-[#006973]/10 px-3 py-1 rounded-full mb-3">
            {isArabic ? 'تحديث: 10 أغسطس 2026' : 'Updated: August 10, 2026'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight">
            {isArabic ? 'مركز حماية البيانات والخصوصية' : 'Data Protection & Privacy Center'}
          </h1>
          <p className="text-[#6B7280] text-sm mt-2 leading-relaxed">
            {isArabic 
              ? 'وثائق سياسة الخصوصية وملفات الارتباط لمنصة مسبار بما يتوافق مع الأنظمة السعودية والهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA).' 
              : 'SBR AI Privacy and Cookie Policy documents in full compliance with Saudi Personal Data Protection Law (PDPL).'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-xl border border-[#E5E7EB] mb-8 max-w-md">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'privacy' 
                ? 'bg-[#006973] text-white shadow-sm' 
                : 'text-[#4B5563] hover:text-[#006973] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shield_locked</span>
            <span>{isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
          </button>
          
          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'cookies' 
                ? 'bg-[#006973] text-white shadow-sm' 
                : 'text-[#4B5563] hover:text-[#006973] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">cookie</span>
            <span>{isArabic ? 'سياسة ملفات الارتباط' : 'Cookie Policy'}</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-10 shadow-sm">
          
          {activeTab === 'privacy' ? (
            /* =========================================================================
               ======================== PRIVACY POLICY CONTENT =========================
               ========================================================================= */
            isArabic ? (
              // PRIVACY POLICY (ARABIC)
              <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
                
                {/* Intro */}
                <div className="p-4 bg-[#006973]/5 border border-[#006973]/10 rounded-xl space-y-2">
                  <p className="font-bold text-[#006973] text-xs">١. نطاق هذه السياسة وتطبيقها</p>
                  <p className="text-xs leading-relaxed text-[#4B5563]">
                    توضح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك لموقعنا الإلكتروني (sbr-ai.com) واشتراكك في منصة مسبار (SBR AI). تُقرأ هذه السياسة جنبًا إلى جنب مع سياسة ملفات الارتباط (الكوكيز) وتخضع بالكامل لنظام حماية البيانات الشخصية السعودي (PDPL) واللوائح الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA).
                  </p>
                  <p className="text-xs font-semibold text-[#ef4444]">
                    ملاحظة هامة: لا تغطي هذه السياسة معالجة البيانات الطبية أو بيانات المرضى داخل منصة SBR AI أو تطبيق العيادة؛ حيث تخضع تلك البيانات الحساسة حصرًا لاتفاقية معالجة البيانات الطبية (DPA) ونموذج موافقة المريض المعتمد.
                  </p>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٢. البيانات الشخصية التي نجمعها</h2>
                  <p>اعتمادًا على طبيعة استخدامك لخدماتنا، نقوم بجمع البيانات التالية:</p>
                  <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                    <li><strong className="text-[#111827]">بيانات التسجيل الأساسية:</strong> الاسم الكامل، المسمى الوظيفي، التخصص الطبي، اسم المستشفى أو العيادة.</li>
                    <li><strong className="text-[#111827]">بيانات الاتصال:</strong> عنوان البريد الإلكتروني، رقم الهاتف المحمول (الخلوي)، والرمز البريدي.</li>
                    <li><strong className="text-[#111827]">بيانات الحساب والاشتراك:</strong> اسم المستخدم، كلمة المرور المشفرة، تفاصيل خطة الاشتراك، وتاريخ التجديد والفوترة.</li>
                    <li><strong className="text-[#111827]">البيانات التقنية والأنشطة:</strong> عنوان بروتوكول الإنترنت (IP)، نوع المتصفح، الصفحات التي تصفحتها، مدة الزيارة، وبيانات التحليل الفني.</li>
                    <li><strong className="text-[#111827]">بيانات الدفع:</strong> نقوم بمعالجة عمليات الدفع عبر بوابات دفع خارجية معتمدة؛ ونحن لا نقوم بتخزين أي معلومات لبطاقتك الائتمانية أو الحساب البنكي على خوادمنا بشكل مباشر.</li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٣. كيف نجمع بياناتك</h2>
                  <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                    <li><strong className="text-[#111827]">جمع مباشر:</strong> عند قيامك بإنشاء حساب، الاشتراك في الخدمة، تعبئة النماذج، أو الاتصال بالدعم الفني.</li>
                    <li><strong className="text-[#111827]">جمع تلقائي:</strong> من خلال ملفات تعريف الارتباط (الكوكيز) وسجلات النظام أثناء تصفحك للموقع.</li>
                    <li><strong className="text-[#111827]">مصادر خارجية:</strong> عبر موفري خدمات الدفع المعتمدين لتحديث حالة الفواتير والاشتراك.</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٤. لماذا نستخدم بياناتك (الأساس القانوني)</h2>
                  <p>نعالج بياناتك الشخصية بناءً على الأسس النظامية التالية:</p>
                  <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                    <li><strong className="text-[#111827]">تنفيذ العقد:</strong> لتمكينك من استخدام خدمات المنصة وإدارة حسابك ومعالجة عمليات الفوترة وتجديد الاشتراك.</li>
                    <li><strong className="text-[#111827]">موافقتك الصريحة:</strong> عند رغبتك في استلام رسائل تسويقية أو تفعيل كوكيز اختيارية.</li>
                    <li><strong className="text-[#111827]">الامتثال للالتزامات النظامية:</strong> مثل الاحتفاظ بالسجلات الضريبية والمحاسبية لتقديمها لهيئة الزكاة والضريبة والجمارك (ZATCA).</li>
                    <li><strong className="text-[#111827]">المصلحة المشروعة:</strong> لحماية أمن الموقع الإلكتروني وحظر محاولات الاختراق أو الاستخدام المسيء.</li>
                  </ul>
                </div>

                {/* Section 5 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٥. مشاركة البيانات والإفصاح عنها</h2>
                  <p>لا نقوم ببيع أو تأجير بياناتك لأي أطراف خارجية. قد نشارك البيانات فقط في الحالات التالية:</p>
                  <ul className="list-disc list-inside space-y-1.5 pr-2 text-xs text-[#4B5563]">
                    <li>مع موفري خدمات البنية التحتية، الاستضافة، بوابات الدفع، وأدوات التحليلات المعتمدين والمقيدين بشروط سرية صارمة.</li>
                    <li>عند وجود التزام نظامي أو استجابة لطلب من الجهات الحكومية أو القضائية المختصة في المملكة العربية السعودية.</li>
                    <li>لحماية سلامة المنصة وحقوقنا وحقوق المستخدمين الآخرين.</li>
                  </ul>
                </div>

                {/* Section 6 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٦. التسويق والرسائل الدعائية</h2>
                  <p>
                    نلتزم بالمادة ٢٥ من نظام حماية البيانات الشخصية. لن نرسل إليك أي مواد إعلانية أو ترويجية إلا بعد الحصول على موافقتك الصريحة المسبقة. يمكنك سحب هذه الموافقة وإيقاف الرسائل في أي وقت عبر النقر على رابط "إلغاء الاشتراك" الموجود في أسفل الرسائل أو بمراسلتنا.
                  </p>
                </div>

                {/* Section 7 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٧. أمن البيانات وحمايتها</h2>
                  <p>
                    نحن نطبق تدابير تقنية وإدارية متطورة لحماية بياناتك من الفقد والتسريب أو الدخول غير المصرح به. نستخدم بروتوكولات تشفير متكاملة وقواعد بيانات معزولة. في حال حدوث أي تسريب أو اختراق يشكل خطراً نظامياً على بياناتك، نلتزم بإبلاغ الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) خلال ٧٢ ساعة من علمنا بالواقعة، مع إشعارك فوراً بالخطوات الوقائية اللازمة.
                  </p>
                </div>

                {/* Section 8 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٨. تخزين البيانات والنقل الدولي</h2>
                  <p>
                    يتم تخزين ومعالجة جميع البيانات الشخصية على خوادم محلية آمنة داخل المملكة العربية السعودية. لا يتم نقل أي بيانات خارج المملكة إلا إذا كان ذلك ضرورياً لتشغيل بعض مزودي الخدمات العالميين (مثل خدمات الحوسبة السحابية المتقدمة)، وفي هذه الحالة نلتزم بضمان توفير حماية مساوية لنظام حماية البيانات الشخصية السعودي والحصول على التراخيص المطلوبة.
                  </p>
                </div>

                {/* Section 9 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٩. مدة الاحتفاظ بالبيانات</h2>
                  <p>
                    نحتفظ ببيانات حسابك ونشاطك طوال فترة اشتراكك الفعال. في حال إلغاء الاشتراك أو التوقف عن استخدام المنصة، يتم حذف كافة البيانات أو إخفاء هويتها تماماً خلال عام واحد من تاريخ التوقف.
                  </p>
                  <p className="font-semibold text-xs text-[#4B5563]">
                    استثناء: يتم الاحتفاظ بسجلات المعاملات المالية والفواتير لمدة ٦ سنوات على الأقل بعد انتهاء الفترة الضريبية التزاماً بأنظمة هيئة الزكاة والضريبة والجمارك (ZATCA)، ولا يمكن حذفها قبل هذه المدة حتى في حال حذف الحساب.
                  </p>
                </div>

                {/* Section 10 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">١٠. حقوقك بموجب نظام حماية البيانات الشخصية</h2>
                  <p>بصفتك صاحب بيانات في المملكة العربية السعودية، يحق لك ممارسة الحقوق التالية:</p>
                  <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#4B5563]">
                    <li><strong className="text-[#111827]">حق العلم:</strong> معرفة الأساس القانوني والغرض المحدد من جمع بياناتك.</li>
                    <li><strong className="text-[#111827]">حق الوصول:</strong> طلب الاطلاع على البيانات التي نحتفظ بها عنك والحصول على نسخة منها.</li>
                    <li><strong className="text-[#111827]">حق التصحيح:</strong> طلب تعديل أو تحديث أي بيانات غير دقيقة أو ناقصة.</li>
                    <li><strong className="text-[#111827]">حق الإتلاف (الحذف):</strong> طلب إتلاف بياناتك الشخصية عند انتهاء الغرض منها (مع مراعاة فترات الاحتفاظ الإلزامية مثل ZATCA).</li>
                    <li><strong className="text-[#111827]">حق نقل البيانات:</strong> طلب الحصول على بياناتك بصيغة مقروءة آلياً لنقلها لمزود آخر.</li>
                  </ul>
                  <p>
                    لممارسة أي من هذه الحقوق، يرجى التواصل معنا عبر البريد: <strong className="text-[#006973]">contact@sbr-ai.com</strong>. يحق لك تقديم شكوى رسمية إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) إذا لم نقم بالرد خلال المهلة النظامية أو لم تكن راضياً عن الرد.
                  </p>
                </div>

              </div>
            ) : (
              // PRIVACY POLICY (ENGLISH)
              <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
                
                {/* Intro */}
                <div className="p-4 bg-[#006973]/5 border border-[#006973]/10 rounded-xl space-y-2">
                  <p className="font-bold text-[#006973] text-xs">1. Scope of This Policy</p>
                  <p className="text-xs leading-relaxed text-[#4B5563]">
                    This Privacy Policy explains how we collect, use, and safeguard your personal data when using our website (sbr-ai.com) and subscribing to the SBR AI platform. It is aligned with the Saudi Personal Data Protection Law (PDPL) and regulations issued by the Saudi Data and Artificial Intelligence Authority (SDAIA).
                  </p>
                  <p className="text-xs font-semibold text-[#ef4444]">
                    Important Notice: This policy does not apply to clinical or patient data processed within the SBR AI platform itself. Patient records and medical notes are governed strictly by the Data Processing Addendum (DPA) and clinical consent forms.
                  </p>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">2. Data We Collect</h2>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#4B5563]">
                    <li><strong>Account Info:</strong> Full name, medical specialization, workplace, email address, and phone number.</li>
                    <li><strong>Subscription Info:</strong> Current tier, renewal date, and transaction records.</li>
                    <li><strong>Technical Data:</strong> IP address, browser type, device information, and interaction history.</li>
                    <li><strong>Payment Data:</strong> All payments are handled securely by third-party payment gateways; we never store your credit card digits on our servers.</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">3. Why We Process Your Data (Legal Basis)</h2>
                  <p>We process your data based on the following grounds:</p>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#4B5563]">
                    <li><strong>Contractual Necessity:</strong> To activate and maintain your account, billing, and subscription features.</li>
                    <li><strong>Consent:</strong> For sending marketing announcements or optional analytics cookies.</li>
                    <li><strong>Regulatory Obligations:</strong> Including transaction record keeping as required by ZATCA for tax audits.</li>
                    <li><strong>Legitimate Interest:</strong> Protecting our systems from fraudulent activities or unauthorized access attempts.</li>
                  </ul>
                </div>

                {/* Section 9 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">4. Data Retention</h2>
                  <p>
                    We retain your account details as long as your subscription is active. Inactive account data is deleted or fully anonymized within one year of cancellation.
                  </p>
                  <p className="font-semibold text-xs text-[#4B5563]">
                    Exception: Invoice records and ZATCA audit logs are kept for a minimum of 6 years after each tax period as mandated by KSA tax regulations.
                  </p>
                </div>

                {/* Section 10 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">5. Your Legal Rights</h2>
                  <p>Under KSA PDPL, you hold the following rights:</p>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#4B5563]">
                    <li><strong>Right to be Informed:</strong> To know how and why your personal details are processed.</li>
                    <li><strong>Right to Access:</strong> To obtain a clear copy of your records.</li>
                    <li><strong>Right to Correction:</strong> To rectify any outdated or inaccurate details.</li>
                    <li><strong>Right to Destruction (Deletion):</strong> To request permanent removal of your data when no longer needed.</li>
                  </ul>
                  <p>
                    To enforce these rights, please email us at <strong className="text-[#006973]">contact@sbr-ai.com</strong>. You also reserve the right to submit a complaint directly to SDAIA.
                  </p>
                </div>

              </div>
            )
          ) : (
            /* =========================================================================
               ======================== COOKIE POLICY CONTENT ==========================
               ========================================================================= */
            isArabic ? (
              // COOKIE POLICY (ARABIC)
              <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
                
                {/* Intro */}
                <div className="p-4 bg-[#006973]/5 border border-[#006973]/10 rounded-xl space-y-1">
                  <p className="text-xs text-[#4B5563]">
                    تُبين هذه السياسة استخدامنا لملفات تعريف الارتباط (الكوكيز) والتقنيات المماثلة في موقعنا الإلكتروني (sbr-ai.com). نهدف من خلال الكوكيز إلى توفير واجهة مستخدم آمنة وتخصيص تفضيلاتك لتحسين التجربة الرقمية.
                  </p>
                </div>

                {/* Section 1 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">١. ما هي ملفات تعريف الارتباط؟</h2>
                  <p>
                    ملفات الارتباط هي ملفات نصية صغيرة يتم حفظها على متصفحك أو جهازك (كمبيوتر، جهاز لوحي، هاتف ذكي) عند زيارتك للموقع. تساعد هذه الملفات خوادمنا في التعرف على جهازك وحفظ تفضيلاتك اللغوية والأمنية لزيارتك القادمة.
                  </p>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٢. أنواع الكوكيز التي نستخدمها</h2>
                  <p>نقسم الكوكيز في منصتنا إلى ثلاثة أقسام رئيسية:</p>
                  <div className="space-y-4 pr-2">
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
                      <h3 className="font-bold text-xs text-[#006973]">أ. كوكيز ضرورية للغاية (Strictly Necessary Cookies)</h3>
                      <p className="text-xs text-[#6B7280]">
                        تعد هذه الملفات أساسية لعمل الموقع وحمايته. تُستخدم لحفظ جلسة تسجيل الدخول الآمنة للأطباء والمنشآت وتأمين عمليات الشراء والوقاية من الهجمات الخبيثة (مثل CSRF). لا يمكنك تصفح الموقع أو تسجيل الدخول بدونهما، وهي مفعلة دائماً ولا تتطلب موافقة مسبقة.
                      </p>
                    </div>
                    
                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
                      <h3 className="font-bold text-xs text-[#006973]">ب. كوكيز تفضيلية ووظيفية (Functionality Cookies)</h3>
                      <p className="text-xs text-[#6B7280]">
                        تساعد هذه الكوكيز الموقع على تذكر الاختيارات التي قمت بها سابقاً، مثل لغتك المفضلة (العربية أو الإنجليزية) وحفظ تفضيلات واجهة المستخدم لتوفير تجربة مخصصة لك في زيارتك القادمة.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
                      <h3 className="font-bold text-xs text-[#006973]">ج. كوكيز تحليلية وإحصائية (Performance & Analytics Cookies)</h3>
                      <p className="text-xs text-[#6B7280]">
                        نستخدمها لجمع إحصاءات عامة ومجهولة الهوية حول كيفية تفاعل المستخدمين مع الموقع والصفحات الأكثر زيارة والروابط النشطة. نستخدم هذه البيانات لتحسين وتطوير أداء المنصة وسهولة الاستخدام.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٣. إدارة تفضيلات الكوكيز والموافقة</h2>
                  <p>
                    عند زيارتك الأولى لموقعنا، يظهر لك شريط إعدادات الكوكيز يتيح لك قبول أو رفض الكوكيز التحليلية والوظيفية بشكل اختياري. يمكنك في أي وقت سحب موافقتك أو تعديل إعدادات الكوكيز من متصفحك مباشرة أو عبر إعدادات الموقع، دون أن يؤثر ذلك على مشروعية المعالجة التي تمت قبل سحب الموافقة.
                  </p>
                </div>

                {/* Section 4 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٤. كوكيز الأطراف الثالثة ونقل البيانات</h2>
                  <p>
                    قد نستخدم بعض الأدوات والخدمات التحليلية التابعة لأطراف ثالثة موثوقة (مثل خدمات جوجل التحليلية). إذا كانت هذه الكوكيز تقوم بنقل أو معالجة البيانات على خوادم خارج المملكة العربية السعودية، فإننا نحرص بالكامل على توافق تلك العمليات مع نظام حماية البيانات الشخصية السعودي للنقل الدولي وتوفير الضمانات الكافية لحماية أمن بياناتك.
                  </p>
                </div>

                {/* Section 5 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-r-4 border-[#006973] pr-3">٥. تعطيل ملفات الارتباط بالكامل</h2>
                  <p>
                    بإمكانك ضبط متصفحك لرفض وحظر الكوكيز بالكامل (بما فيها الكوكيز الضرورية). يرجى ملاحظة أن حظر الكوكيز الضرورية سيمنعك من تسجيل الدخول إلى حسابك أو استخدام وظائف المنصة الأساسية. لمزيد من التفاصيل حول كيفية حظر الكوكيز، يمكنك زيارة الموقع التثقيفي: <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-[#006973] underline font-semibold">allaboutcookies.org</a>.
                  </p>
                </div>

              </div>
            ) : (
              // COOKIE POLICY (ENGLISH)
              <div className="space-y-8 text-[#374151] leading-relaxed text-justify text-sm">
                
                {/* Intro */}
                <div className="p-4 bg-[#006973]/5 border border-[#006973]/10 rounded-xl space-y-1">
                  <p className="text-xs text-[#4B5563]">
                    This Cookie Policy explains how we use cookies and similar technologies on sbr-ai.com to ensure secure and optimized access to our website and clinical services.
                  </p>
                </div>

                {/* Section 1 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">1. What are Cookies?</h2>
                  <p>
                    Cookies are small text files stored on your web browser or hardware device (computer, tablet, or smartphone) when visiting a website. They help the website remember your login state, preferred display language, and secure settings.
                  </p>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">2. How We Categorize Cookies</h2>
                  <div className="space-y-3 pl-2">
                    <p><strong className="text-[#111827]">A. Strictly Necessary Cookies:</strong> Vital for running the platform's core security. These include session storage for authentication and CSRF token protection. They are always active and do not require user consent.</p>
                    <p><strong className="text-[#111827]">B. Functional Cookies:</strong> Save your interface preferences such as language settings (AR/EN) for subsequent visits.</p>
                    <p><strong className="text-[#111827]">C. Analytical & Performance Cookies:</strong> Gather anonymous statistics regarding page visits and navigation to help us improve user experience.</p>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-[#111827] border-l-4 border-[#006973] pl-3">3. Controlling Your Consent</h2>
                  <p>
                    On your first visit, a configuration banner allows you to explicitly toggle functional and analytical cookies. You can revoke your consent at any time via browser settings or our website privacy center without affecting the validity of prior processing.
                  </p>
                </div>

              </div>
            )
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
