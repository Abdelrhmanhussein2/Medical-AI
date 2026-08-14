import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  const { isArabic, lang, setLang } = useLanguage();

  const sections = [
    {
      titleAr: '1. استخدام المنصة',
      titleEn: '1. Use of the Platform',
      bodyAr: `SBR AI منصة تقنية تهدف إلى مساعدة المستخدمين في التوثيق وتنظيم سير العمل باستخدام تقنيات الذكاء الاصطناعي.

يمكن لأي شخص إنشاء حساب واستخدام المنصة، ولا تتحقق SBR AI من صفة المستخدم المهنية أو كونه طبيبًا أو مقدم رعاية صحية.

الحساب شخصي ومخصص للمستخدم المسجل، ولا يجوز مشاركة بيانات الدخول أو استخدام الحساب من قبل أشخاص آخرين.`,
      bodyEn: `SBR AI is a technology platform designed to help users document and organize workflows using AI technologies.

Anyone can create an account and use the platform; SBR AI does not verify the professional status of users or whether they are physicians or healthcare providers.

The account is personal and intended for the registered user only. Sharing login credentials or allowing others to use the account is not permitted.`,
    },
    {
      titleAr: '2. طبيعة خدمات SBR AI',
      titleEn: '2. Nature of SBR AI Services',
      bodyAr: `SBR AI هي أداة مساعدة تقنية ولا تُعد بديلًا عن الطبيب أو مقدم الرعاية الصحية أو الحكم والخبرة الطبية المتخصصة.

لا تتحمل SBR AI مسؤولية التشخيص أو العلاج أو القرارات الطبية التي يتخذها المستخدم.

أي معلومات أو اقتراحات أو مخرجات قد تنتجها تقنيات الذكاء الاصطناعي في المنصة يجب مراجعتها والتحقق منها من قبل المستخدم المختص قبل الاعتماد عليها أو استخدامها في أي قرار طبي.

المسؤولية النهائية عن مراجعة المخرجات واستخدامها تقع على عاتق المستخدم.`,
      bodyEn: `SBR AI is a technical assistance tool and is not a substitute for a physician, healthcare provider, or specialized medical judgment.

SBR AI bears no responsibility for diagnoses, treatments, or medical decisions made by the user.

Any information, suggestions, or outputs produced by the platform's AI technologies must be reviewed and verified by the competent user before being relied upon or used in any medical decision.

Final responsibility for reviewing and using outputs rests with the user.`,
    },
    {
      titleAr: '3. التسجيل الصوتي وموافقة المراجعين',
      titleEn: '3. Audio Recording and Patient Consent',
      bodyAr: `قد تتيح المنصة للمستخدم تسجيل المحادثات الصوتية لأغراض التوثيق والتحليل وإنشاء المخرجات المدعومة بالذكاء الاصطناعي.
 
يتحمل الطبيب أو العيادة أو المستخدم المسؤولية الكاملة عن الحصول على الموافقات والتصاريح اللازمة من المراجعين أو الأشخاص الذين يتم تسجيلهم قبل استخدام خاصية التسجيل، والالتزام بالأنظمة واللوائح المعمول بها.`,
      bodyEn: `The platform may allow users to record audio conversations for documentation, analysis, and AI-powered output generation.
 
The physician, clinic, or user bears full responsibility for obtaining the necessary consents and permissions from patients or persons being recorded prior to using the recording feature, and for complying with applicable regulations.`,
    },
    {
      titleAr: '4. المحتوى والمدخلات',
      titleEn: '4. Content and Inputs',
      bodyAr: `تتيح SBR AI حاليًا معالجة التسجيلات الصوتية التي يتم إنشاؤها من خلال المنصة.
 
ولا تتيح المنصة للمستخدم رفع ملفات أو صور أو مستندات أخرى إلى الخدمة، ما لم يتم توفير هذه الوظائف مستقبلًا.
 
يتحمل المستخدم مسؤولية المحتوى والبيانات التي يقوم بإدخالها أو تسجيلها من خلال المنصة، والتأكد من أن استخدامه للمنصة لا ينتهك حقوق الآخرين أو الأنظمة المعمول بها.`,
      bodyEn: `SBR AI currently supports processing of audio recordings created through the platform.
 
The platform does not allow users to upload files, images, or other documents to the service unless such features are provided in the future.
 
The user is responsible for the content and data they input or record through the platform, and for ensuring that their use of the platform does not violate the rights of others or applicable regulations.`,
    },
    {
      titleAr: '5. بيانات المستخدم والمراجعين',
      titleEn: '5. User and Patient Data',
      bodyAr: `لا تكتسب SBR AI ملكية بيانات المستخدم أو بيانات المراجعين لمجرد إدخالها أو معالجتها من خلال المنصة.
 
تظل البيانات المقدمة من المستخدم خاضعة للحقوق والالتزامات الموضحة في سياسة الخصوصية الخاصة بـ SBR AI.
 
يجوز لـSBR AI استخدام بيانات محددة لأغراض تطوير وتحسين تقنيات الذكاء الاصطناعي الخاصة بها، وذلك بعد اتخاذ إجراءات مناسبة لإزالة أو إخفاء المعلومات التي يمكن أن تحدد هوية المراجعين، وفقًا لما توضحه سياسة الخصوصية.`,
      bodyEn: `SBR AI does not acquire ownership of user or patient data merely by virtue of it being entered or processed through the platform.
 
Data submitted by the user remains subject to the rights and obligations described in SBR AI's Privacy Policy.
 
SBR AI may use specific data for the purpose of developing and improving its AI technologies, after taking appropriate steps to remove or anonymize information that could identify patients, as outlined in the Privacy Policy.`,
    },
    {
      titleAr: '6. الملكية الفكرية',
      titleEn: '6. Intellectual Property',
      bodyAr: `جميع حقوق الملكية الفكرية المتعلقة بمنصة SBR AI، بما في ذلك البرمجيات والتصميمات والواجهة والعلامات التجارية والشعارات والمحتوى المملوك للمنصة، تظل ملكًا لـSBR AI أو الجهات المرخصة لها، ولا يمنح استخدام المنصة المستخدم أي حق ملكية فيها.`,
      bodyEn: `All intellectual property rights related to the SBR AI platform, including software, designs, interfaces, trademarks, logos, and platform-owned content, remain the property of SBR AI or its licensors. Use of the platform does not grant the user any ownership rights therein.`,
    },
    {
      titleAr: '7. الاستخدامات المحظورة',
      titleEn: '7. Prohibited Uses',
      bodyAr: `لا يجوز للمستخدم استخدام المنصة:
• بطريقة غير قانونية.
• بطريقة تضر بالمنصة أو مستخدميها.
• لمحاولة اختراق أو تعطيل أو تجاوز أنظمة الحماية.
• لمشاركة الحساب أو بيانات الدخول مع أشخاص آخرين.
• للوصول غير المصرح به إلى حسابات أو بيانات الآخرين.
• لأي غرض ينتهك حقوق أو خصوصية الآخرين.`,
      bodyEn: `The user may not use the platform:
• In an unlawful manner.
• In a way that harms the platform or its users.
• To attempt to breach, disable, or circumvent security systems.
• To share the account or login credentials with others.
• For unauthorized access to accounts or data of others.
• For any purpose that violates the rights or privacy of others.`,
    },
    {
      titleAr: '8. تعليق أو إنهاء الحساب',
      titleEn: '8. Account Suspension or Termination',
      bodyAr: `تحتفظ SBR AI بالحق في تعليق أو إنهاء حساب المستخدم عند وجود مخالفة لهذه الشروط، بما في ذلك إساءة استخدام المنصة أو مشاركة الحساب أو الاستخدام غير القانوني أو محاولة اختراق أو تجاوز أنظمة المنصة.

ويجوز اتخاذ إجراءات فورية عند الضرورة لحماية المنصة أو المستخدمين أو البيانات.`,
      bodyEn: `SBR AI reserves the right to suspend or terminate a user account in the event of a violation of these terms, including misuse of the platform, account sharing, unlawful use, or attempts to breach or bypass the platform's systems.

Immediate action may be taken when necessary to protect the platform, users, or data.`,
    },
    {
      titleAr: '9. الخدمات والجهات الخارجية',
      titleEn: '9. Third-Party Services',
      bodyAr: `قد تعتمد SBR AI على خدمات ومزودين خارجيين لتشغيل بعض أجزاء المنصة، بما في ذلك خدمات البنية التحتية ومعالجة البيانات والذكاء الاصطناعي والدفع.

يتم التعامل مع هذه الخدمات وفقًا لطبيعة كل خدمة ومتطلبات تشغيل المنصة وسياسة الخصوصية.

ولا تقوم SBR AI بتخزين بيانات البطاقات البنكية الخاصة بالمستخدمين، حيث تتم معالجة المدفوعات من خلال مزود خدمة دفع خارجي.`,
      bodyEn: `SBR AI may rely on third-party services and providers to operate parts of the platform, including infrastructure, data processing, AI, and payment services.

These services are handled in accordance with the nature of each service, the platform's operational requirements, and the Privacy Policy.

SBR AI does not store users' bank card data; payments are processed through a third-party payment service provider.`,
    },
    {
      titleAr: '10. توفر الخدمة',
      titleEn: '10. Service Availability',
      bodyAr: `تسعى SBR AI إلى توفير المنصة بصورة مستقرة وموثوقة، إلا أنه قد تحدث فترات توقف مؤقت أو صيانة أو أعطال تقنية أو انقطاع في بعض الخدمات.

ولا تضمن SBR AI أن تكون المنصة متاحة دون انقطاع أو خالية من الأخطاء في جميع الأوقات.`,
      bodyEn: `SBR AI strives to provide the platform in a stable and reliable manner; however, temporary outages, maintenance, technical failures, or service interruptions may occur.

SBR AI does not guarantee that the platform will be available without interruption or free of errors at all times.`,
    },
    {
      titleAr: '11. الاشتراكات والمدفوعات',
      titleEn: '11. Subscriptions and Payments',
      bodyAr: `تخضع الاشتراكات المدفوعة والأسعار ومدة الاشتراك والإلغاء والاسترجاع إلى سياسة الاسترجاع والإلغاء المنشورة على منصة SBR AI.`,
      bodyEn: `Paid subscriptions, pricing, subscription duration, cancellation, and refunds are governed by the Refund and Cancellation Policy published on the SBR AI platform.`,
    },
    {
      titleAr: '12. مسؤولية المستخدم',
      titleEn: '12. User Responsibility',
      bodyAr: `المستخدم مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة بحسابه وعن جميع الأنشطة التي تتم من خلال الحساب.

كما يتحمل المستخدم مسؤولية استخدام المنصة بطريقة قانونية ومناسبة لطبيعة استخدامه.`,
      bodyEn: `The user is responsible for maintaining the confidentiality of their account login credentials and for all activities that occur through the account.

The user is also responsible for using the platform in a lawful manner appropriate to the nature of their use.`,
    },
    {
      titleAr: '13. حدود المسؤولية',
      titleEn: '13. Limitation of Liability',
      bodyAr: `لا تتحمل SBR AI مسؤولية القرارات الطبية أو المهنية التي يتخذها المستخدم بناءً على مخرجات المنصة.

كما لا تتحمل SBR AI مسؤولية الأضرار الناتجة عن سوء استخدام المنصة أو الاعتماد غير المناسب على مخرجات الذكاء الاصطناعي أو عدم مراجعة المستخدم للمعلومات الناتجة عن الخدمة.`,
      bodyEn: `SBR AI is not responsible for medical or professional decisions made by the user based on platform outputs.

SBR AI is also not responsible for damages resulting from misuse of the platform, inappropriate reliance on AI outputs, or the user's failure to review information produced by the service.`,
    },
    {
      titleAr: '14. حذف الحساب والبيانات',
      titleEn: '14. Account and Data Deletion',
      bodyAr: `يمكن للمستخدم طلب حذف حسابه وفق الإجراءات التي توفرها SBR AI.

بعد حذف الحساب، قد تحتفظ SBR AI ببعض البيانات المرتبطة بالحساب لمدة تصل إلى شهرين لأغراض تشغيلية أو أمنية أو قانونية، وبعد انتهاء فترة الاحتفاظ يتم حذف البيانات وفق إجراءات SBR AI المعمول بها.`,
      bodyEn: `The user may request deletion of their account through procedures provided by SBR AI.

After account deletion, SBR AI may retain some account-related data for up to two months for operational, security, or legal purposes. After the retention period, data is deleted according to SBR AI's applicable procedures.`,
    },
    {
      titleAr: '15. تعديل الشروط',
      titleEn: '15. Modification of Terms',
      bodyAr: `تحتفظ SBR AI بحقها في تعديل هذه الشروط والأحكام من وقت لآخر بما يتناسب مع تطور المنصة أو الخدمات أو المتطلبات القانونية.

سيتم نشر النسخة المحدثة على الموقع مع توضيح تاريخ آخر تحديث.`,
      bodyEn: `SBR AI reserves the right to modify these terms and conditions from time to time in line with the evolution of the platform, services, or legal requirements.

The updated version will be published on the website with the date of the last update clearly indicated.`,
    },
    {
      titleAr: '16. التواصل',
      titleEn: '16. Contact',
      bodyAr: `للاستفسارات المتعلقة بهذه الشروط أو استخدام المنصة، يمكن التواصل مع SBR AI عبر:

contact@sbr-ai.com`,
      bodyEn: `For inquiries regarding these terms or use of the platform, contact SBR AI at:

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
            {isArabic ? 'الشروط والأحكام' : 'Terms & Conditions'}
          </h1>
          <p className="text-secondary text-sm mt-3 leading-relaxed">
            {isArabic
              ? 'باستخدام منصة SBR AI أو إنشاء حساب عليها، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.'
              : 'By using the SBR AI platform or creating an account on it, you agree to comply with these terms and conditions. If you do not agree to any of these terms, please do not use the platform.'}
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
