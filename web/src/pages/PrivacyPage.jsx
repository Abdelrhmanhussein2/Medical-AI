import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const { isArabic, lang, setLang } = useLanguage();

  const sections = [
    {
      titleAr: '1. معالجة التسجيلات الصوتية',
      titleEn: '1. Processing of Audio Recordings',
      bodyAr: `يتم تشفير جميع المحادثات الطبية المرفوعة لحظياً. نستخدم معالجة صوتية مشفرة بالكامل ولا يتم تخزين الملفات الصوتية الخام بعد استخراج الملاحظات لحماية خصوصية المراجع.`,
      bodyEn: `All uploaded medical conversations are encrypted instantly. We use fully encrypted audio processing and do not store raw audio files after clinical notes are extracted, in order to protect patient privacy.`,
    },
    {
      titleAr: '2. التزام حماية البيانات الطبية',
      titleEn: '2. Commitment to Protecting Medical Data',
      bodyAr: `نحن لا نشارك أو نبيع أي معلومات طبية للمستخدمين أو المراجعين. تظل مساحة عملك معزولة تماماً ولا يحق لأي جهة خارجية الوصول إلى بيانات مراجعيك دون إذنك الصريح.`,
      bodyEn: `We do not share or sell any medical information belonging to users or patients. Your clinical workspace remains fully isolated, and no external party has the right to access your patients' data without your explicit permission.`,
    },
    {
      titleAr: '3. الأمان وحماية البيانات',
      titleEn: '3. Security and Data Protection',
      bodyAr: `تعتمد المنصة بنية تقنية تهدف إلى حماية بيانات المستخدمين والمراجعين. يتم تشفير البيانات أثناء النقل وفي حالة السكون.

لا تقوم SBR AI بتخزين بيانات البطاقات البنكية؛ تتم معالجة المدفوعات من خلال مزود خدمة دفع خارجي.`,
      bodyEn: `The platform uses a technical architecture designed to protect user and patient data. Data is encrypted both in transit and at rest.

SBR AI does not store bank card data; payments are processed through a third-party payment service provider.`,
    },
    {
      titleAr: '4. ملكية البيانات',
      titleEn: '4. Data Ownership',
      bodyAr: `لا تكتسب SBR AI ملكية بيانات المستخدم أو بيانات المراجعين لمجرد إدخالها أو معالجتها من خلال المنصة.

يجوز لـSBR AI استخدام بيانات محددة لأغراض تطوير وتحسين تقنيات الذكاء الاصطناعي الخاصة بها، وذلك بعد اتخاذ إجراءات مناسبة لإزالة أو إخفاء المعلومات التي يمكن أن تحدد هوية المراجعين.`,
      bodyEn: `SBR AI does not acquire ownership of user or patient data merely by virtue of it being entered or processed through the platform.

SBR AI may use specific data for developing and improving its AI technologies, after taking appropriate steps to remove or anonymize information that could identify patients.`,
    },
    {
      titleAr: '5. مشاركة البيانات مع جهات خارجية',
      titleEn: '5. Sharing Data with Third Parties',
      bodyAr: `قد تعتمد SBR AI على مزودين خارجيين لتشغيل بعض أجزاء المنصة، بما في ذلك خدمات البنية التحتية ومعالجة البيانات والذكاء الاصطناعي.

لا تقوم SBR AI ببيع بيانات المستخدمين لأي جهة خارجية لأغراض تسويقية أو تجارية.`,
      bodyEn: `SBR AI may rely on third-party providers to operate parts of the platform, including infrastructure, data processing, and AI services.

SBR AI does not sell user data to any external party for marketing or commercial purposes.`,
    },
    {
      titleAr: '6. موافقة المراجعين على التسجيل',
      titleEn: '6. Patient Consent for Recording',
      bodyAr: `يتحمل المستخدم (الطبيب أو العيادة) المسؤولية الكاملة عن الحصول على موافقة المراجعين قبل إجراء أي تسجيل صوتي من خلال المنصة، والالتزام بالأنظمة واللوائح المعمول بها في هذا الشأن.`,
      bodyEn: `The user (physician or clinic) bears full responsibility for obtaining patient consent prior to any audio recording through the platform, and for complying with applicable regulations in this regard.`,
    },
    {
      titleAr: '7. حذف البيانات',
      titleEn: '7. Data Deletion',
      bodyAr: `يمكن للمستخدم طلب حذف حسابه وبياناته وفق الإجراءات التي توفرها SBR AI.

بعد حذف الحساب، قد تحتفظ SBR AI ببعض البيانات المرتبطة بالحساب لمدة تصل إلى شهرين لأغراض تشغيلية أو أمنية أو قانونية، وبعد انتهاء فترة الاحتفاظ يتم حذف البيانات.`,
      bodyEn: `The user may request deletion of their account and data through procedures provided by SBR AI.

After account deletion, SBR AI may retain some account-related data for up to two months for operational, security, or legal purposes. After the retention period, data is deleted.`,
    },
    {
      titleAr: '8. تعديل سياسة الخصوصية',
      titleEn: '8. Modification of Privacy Policy',
      bodyAr: `تحتفظ SBR AI بحقها في تحديث هذه السياسة من وقت لآخر. سيتم نشر النسخة المحدثة على الموقع مع توضيح تاريخ آخر تحديث.`,
      bodyEn: `SBR AI reserves the right to update this policy from time to time. The updated version will be published on the website with the date of the last update clearly indicated.`,
    },
    {
      titleAr: '9. التواصل',
      titleEn: '9. Contact',
      bodyAr: `للاستفسارات المتعلقة بسياسة الخصوصية أو بياناتك، يمكن التواصل مع SBR AI عبر:

contact@sbr-ai.com`,
      bodyEn: `For inquiries regarding the Privacy Policy or your data, contact SBR AI at:

contact@sbr-ai.com`,
    },
  ];

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-bg-canvas font-body-md">
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
      <main className="pt-24 pb-20 max-w-3xl mx-auto px-4 sm:px-8">
        <div className="mb-8">
          <p className="text-xs text-secondary font-semibold mb-2">{isArabic ? 'آخر تحديث: يُضاف التاريخ' : 'Last updated: date to be added'}</p>
          <h1 className="text-3xl font-display-lg font-bold text-on-surface leading-tight">
            {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <p className="text-secondary text-sm mt-3 leading-relaxed">
            {isArabic
              ? 'نحن في SBR AI نلتزم بحماية خصوصية بياناتك وبيانات مرضاك. توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها.'
              : 'At SBR AI, we are committed to protecting the privacy of your data and your patients\' data. This policy outlines how your data is collected, used, and protected.'}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, i) => (
            <div key={i} className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
              <h2 className="font-headline-md text-base text-primary font-bold mb-3">
                {isArabic ? sec.titleAr : sec.titleEn}
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line">
                {isArabic ? sec.bodyAr : sec.bodyEn}
              </p>
            </div>
          ))}
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
