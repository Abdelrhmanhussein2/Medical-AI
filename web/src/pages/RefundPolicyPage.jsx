import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';
import { Link } from 'react-router-dom';

export default function RefundPolicyPage() {
  const { isArabic, lang, setLang } = useLanguage();

  const sections = [
    {
      titleAr: '1. الحساب المجاني',
      titleEn: '1. Free Account',
      bodyAr: `توفر SBR AI حسابًا مجانيًا محدود الاستخدام، ولا يتطلب إضافة بطاقة بنكية للبدء.

يشمل الحساب المجاني ما يصل إلى:
• 60 دقيقة من خدمات الذكاء الاصطناعي المتعلقة بالصوت.
• 100 رسالة تقريبًا لخدمات المحادثة والذكاء الاصطناعي.

الحساب المجاني غير مرتبط بمدة زمنية محددة، ويظل حساب المستخدم وبياناته موجودين بعد استنفاد الحدود المجانية.

بعد استنفاد الحدود المجانية، يتوقف الوصول إلى الخدمات التي تتطلب استخدامًا مدفوعًا إلى حين الاشتراك في إحدى الباقات المدفوعة.`,
      bodyEn: `SBR AI provides a free account with limited usage that does not require adding a bank card to get started.

The free account includes up to:
• 60 minutes of AI-powered voice services.
• Approximately 100 messages for chat and AI services.

The free account is not tied to a specific time period; the user's account and data remain available after the free limits are exhausted.

After the free limits are exhausted, access to services requiring paid usage is paused until the user subscribes to one of the paid plans.`,
    },
    {
      titleAr: '2. الاشتراكات المدفوعة',
      titleEn: '2. Paid Subscriptions',
      bodyAr: `توفر SBR AI باقات اشتراك شهرية وفق الأسعار والمزايا الموضحة على الموقع.

مدة كل اشتراك هي 30 يومًا من تاريخ تفعيل الاشتراك أو تجديده.

الاشتراكات لا تتجدد تلقائيًا، ويجب على المستخدم إجراء التجديد يدويًا للاستمرار في الاستفادة من المزايا المدفوعة.

يتم احتساب الرسوم بالريال السعودي وفق السعر الموضح للمستخدم عند الاشتراك.`,
      bodyEn: `SBR AI provides monthly subscription plans according to the prices and features listed on the website.

Each subscription period is 30 days from the date of subscription activation or renewal.

Subscriptions do not auto-renew; the user must manually renew to continue benefiting from paid features.

Fees are calculated in Saudi Riyals (SAR) according to the price shown to the user at the time of subscription.`,
    },
    {
      titleAr: '3. إلغاء الاشتراك',
      titleEn: '3. Subscription Cancellation',
      bodyAr: `يمكن للمستخدم إلغاء اشتراكه في أي وقت.

إلغاء الاشتراك لا يؤدي إلى إيقاف الخدمة فورًا، ويستطيع المستخدم الاستمرار في استخدام المزايا المدفوعة حتى انتهاء مدة الاشتراك التي قام بسدادها.

بعد انتهاء مدة الاشتراك، تتوقف المزايا المدفوعة في حال عدم قيام المستخدم بالتجديد.`,
      bodyEn: `The user may cancel their subscription at any time.

Cancellation does not result in immediate service termination; the user may continue using paid features until the end of the subscription period they have paid for.

After the subscription period ends, paid features are paused if the user does not renew.`,
    },
    {
      titleAr: '4. سياسة الاسترجاع المالي',
      titleEn: '4. Financial Refund Policy',
      bodyAr: `جميع الاشتراكات المدفوعة غير قابلة للاسترداد بعد إتمام عملية الدفع.

ولا يحق للمستخدم طلب استرداد قيمة الاشتراك بسبب:
• عدم استخدام الخدمة بالكامل.
• استخدام جزء من المزايا المتاحة.
• إلغاء الاشتراك خلال مدة الاشتراك.
• عدم استخدام الحساب خلال جزء من مدة الاشتراك.

ويستمر المستخدم في الاستفادة من الخدمة حتى نهاية مدة الاشتراك المدفوعة.

في حال واجه المستخدم مشكلة تقنية جوهرية تمنعه من الاستفادة من الخدمة، يمكنه التواصل مع فريق الدعم لمراجعة الحالة.`,
      bodyEn: `All paid subscriptions are non-refundable after payment is completed.

The user is not entitled to request a refund due to:
• Not using the service at all.
• Using only part of the available features.
• Canceling the subscription during the subscription period.
• Not using the account during part of the subscription period.

The user may continue to benefit from the service until the end of the paid subscription period.

If the user encounters a significant technical issue that prevents them from using the service, they may contact the support team to review the situation.`,
    },
    {
      titleAr: '5. اشتراكات العيادات والمؤسسات',
      titleEn: '5. Clinic and Institutional Subscriptions',
      bodyAr: `في الباقات المخصصة للعيادات والمؤسسات، يرتبط الاشتراك بعدد الأطباء المسموح به في الباقة المختارة.

في حال قيام العيادة بإيقاف أحد الأطباء من استخدام المنصة، لا يترتب على ذلك استرداد قيمة الاشتراك أو تخفيض قيمة الباقة خلال مدة الاشتراك الحالية.

يمكن للعيادة إضافة أطباء آخرين ضمن العدد المسموح به في الباقة.`,
      bodyEn: `For plans designated for clinics and institutions, the subscription is tied to the number of physicians permitted under the selected plan.

If a clinic disables a physician from using the platform, this does not entitle the clinic to a refund or a reduction in the plan value during the current subscription period.

The clinic may add other physicians within the number permitted by the plan.`,
    },
    {
      titleAr: '6. انتهاء الاشتراك',
      titleEn: '6. Subscription Expiry',
      bodyAr: `عند انتهاء مدة الاشتراك وعدم قيام المستخدم بالتجديد، يتوقف الوصول إلى المزايا التي تتطلب اشتراكًا مدفوعًا.

ولا يؤدي انتهاء الاشتراك تلقائيًا إلى حذف حساب المستخدم أو بياناته، ويخضع الاحتفاظ بالبيانات وحذفها إلى سياسة الخصوصية الخاصة بـ SBR AI.`,
      bodyEn: `When the subscription period ends and the user does not renew, access to features requiring a paid subscription is paused.

Subscription expiry does not automatically result in deletion of the user's account or data; data retention and deletion are subject to SBR AI's Privacy Policy.`,
    },
    {
      titleAr: '7. التواصل بشأن الاشتراكات والمدفوعات',
      titleEn: '7. Contact Regarding Subscriptions and Payments',
      bodyAr: `للاستفسار عن الاشتراك أو المدفوعات أو وجود مشكلة تقنية، يمكن التواصل مع فريق SBR AI عبر:

contact@sbr-ai.com`,
      bodyEn: `For inquiries regarding subscriptions, payments, or technical issues, contact the SBR AI team at:

contact@sbr-ai.com`,
    },
    {
      titleAr: '8. تعديل السياسة',
      titleEn: '8. Policy Modification',
      bodyAr: `تحتفظ SBR AI بحقها في تحديث هذه السياسة من وقت لآخر بما يتناسب مع تطور خدماتها أو متطلباتها التشغيلية والقانونية.

يتم نشر النسخة المحدثة على الموقع مع توضيح تاريخ آخر تحديث.`,
      bodyEn: `SBR AI reserves the right to update this policy from time to time in line with the evolution of its services or operational and legal requirements.

The updated version will be published on the website with the date of the last update clearly indicated.`,
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
            {isArabic ? 'سياسة الاسترجاع والإلغاء' : 'Refund & Cancellation Policy'}
          </h1>
          <p className="text-secondary text-sm mt-3 leading-relaxed">
            {isArabic
              ? 'توضح هذه السياسة أحكام الاشتراكات المدفوعة والإلغاء والاسترجاع الخاصة بمنصة SBR AI.'
              : 'This policy outlines the terms of paid subscriptions, cancellation, and refunds for the SBR AI platform.'}
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
