/**
 * plans.js — Client-facing pricing catalogue.
 * Strictly matches the 5 bundles in subscription_bundles table:
 * 1. Free Trial       (60 min)   - Free
 * 2. SBR AI Starter   (1000 min) - 149 SAR
 * 3. SBR AI Pro       (3000 min) - 249 SAR
 * 4. SBR AI Business  (5000 min) - 449 SAR
 * 5. SBR AI Enterprise(8000 min) - 599 SAR
 */

export const PLANS = [
  {
    id: 'free',
    nameAr: 'الباقة التجريبية',
    nameEn: 'Free Trial',
    price: 0,
    priceAr: 'مجاناً',
    priceEn: 'Free',
    currencyAr: 'ريال',
    currencyEn: 'SAR',
    minutes: 60,
    featuresAr: [
      '60 دقيقة ذكاء اصطناعي تجريبية.',
      'تحويل محادثة الطبيب والمراجع إلى نص.',
      'تلخيص الزيارة الطبية تلقائياً.',
      'إنشاء الملاحظات الطبية.'
    ],
    featuresEn: [
      '60 minutes of AI trial access.',
      'Transcribe doctor-patient conversation.',
      'Automatically summarize medical visits.',
      'Generate medical SOAP notes.'
    ],
    badgeAr: null,
    badgeEn: null,
    highlight: false
  },
  {
    id: 'starter',
    nameAr: 'الباقة الأساسية',
    nameEn: 'SBR AI Starter',
    price: 149,
    priceAr: '149',
    priceEn: '149',
    currencyAr: 'ريال',
    currencyEn: 'SAR',
    minutes: 1285,
    featuresAr: [
      '1285 دقيقة ذكاء اصطناعي شهرياً.',
      'مناسب لطبيب واحد والاستخدام اليومي المتوسط.',
      'تحويل محادثة الطبيب والمراجع إلى نص.',
      'تلخيص الزيارة الطبية تلقائياً.',
      'إنشاء الملاحظات الطبية.'
    ],
    featuresEn: [
      '1285 AI minutes per month.',
      'Suitable for 1 doctor and average daily use.',
      'Transcribe doctor-patient conversation.',
      'Automatically summarize medical visits.',
      'Generate medical SOAP notes.'
    ],
    badgeAr: null,
    badgeEn: null,
    highlight: false
  },
  {
    id: 'pro',
    nameAr: 'الباقة المتقدمة',
    nameEn: 'SBR AI Pro',
    price: 279,
    priceAr: '279',
    priceEn: '279',
    currencyAr: 'ريال',
    currencyEn: 'SAR',
    minutes: 2570,
    featuresAr: [
      '2570 دقيقة ذكاء اصطناعي شهرياً.',
      'مناسب للأطباء ذوي عدد المراجعين الأعلى.',
      'جميع مزايا باقة Starter.',
      'تقارير استخدام ودعم أكثر من مستخدم.'
    ],
    featuresEn: [
      '2570 AI minutes per month.',
      'Suitable for doctors with higher patient volumes.',
      'All features in Starter plan.',
      'Usage reports and multi-user support.'
    ],
    badgeAr: 'الخيار الأفضل',
    badgeEn: 'Best Choice',
    highlight: true
  },
  {
    id: 'business',
    nameAr: 'باقة الأعمال',
    nameEn: 'SBR AI Business',
    price: 549,
    priceAr: '549',
    priceEn: '549',
    currencyAr: 'ريال',
    currencyEn: 'SAR',
    minutes: 5140,
    featuresAr: [
      '5140 دقيقة ذكاء اصطناعي شهرياً.',
      'مناسب للعيادات ذات الاستخدام المرتفع.',
      'جميع مزايا باقة Pro.',
      'إدارة عدة مستخدمين وصلاحيات.',
      'الخيار الأفضل لمعظم العيادات.'
    ],
    featuresEn: [
      '5140 AI minutes per month.',
      'Suitable for clinics with high usage.',
      'All features in Pro plan.',
      'Manage multiple users and permissions.',
      'Best choice for most clinics.'
    ],
    badgeAr: 'الخيار الأفضل',
    badgeEn: 'Best Choice',
    highlight: true
  },
  {
    id: 'enterprise',
    nameAr: 'باقة المؤسسات',
    nameEn: 'SBR AI Enterprise',
    price: 799,
    priceAr: '799',
    priceEn: '799',
    currencyAr: 'ريال',
    currencyEn: 'SAR',
    minutes: 9000,
    featuresAr: [
      '9000 دقيقة ذكاء اصطناعي شهرياً.',
      'مناسب للمجمعات الطبية والعيادات متعددة الأطباء.',
      'أعلى قدرة استخدام.',
      'أولوية في الدعم الفني.'
    ],
    featuresEn: [
      '9000 AI minutes per month.',
      'Suitable for complexes and multi-doctor clinics.',
      'Highest usage limits.',
      'Priority customer & tech support.'
    ],
    badgeAr: 'الأعلى قيمة',
    badgeEn: 'Highest Limit',
    highlight: false
  }
];

export const DOCTOR_PLANS = PLANS.filter(p => ['free', 'starter', 'pro'].includes(p.id));
export const ORG_PLANS    = PLANS.filter(p => ['free', 'business', 'enterprise'].includes(p.id));

/**
 * Dynamically merges DB-seeded subscription bundles into static plans configuration.
 * Preference is given to target_type matching standard categories.
 */
export const getMergedPlans = (dbBundles) => {
  if (!dbBundles || dbBundles.length === 0) return PLANS;

  const nameToId = {
    'free trial': 'free',
    'sbr ai starter': 'starter',
    'sbr ai pro': 'pro',
    'sbr ai business': 'business',
    'sbr ai enterprise': 'enterprise'
  };

  return PLANS.map(p => {
    // Find the db bundle matching this plan. Prefer doctor target type for doctors, else department
    const dbBundle = dbBundles.find(b => {
      const dbNameClean = (b.name || '').toLowerCase().trim();
      return nameToId[dbNameClean] === p.id && b.target_type === 'doctor';
    }) || dbBundles.find(b => {
      const dbNameClean = (b.name || '').toLowerCase().trim();
      return nameToId[dbNameClean] === p.id;
    });

    if (dbBundle) {
      const allowedMins = p.id === 'free' ? 60 : (dbBundle.allowed_minutes || p.minutes);
      return {
        ...p,
        dbId: dbBundle.id,
        price: dbBundle.price,
        priceAr: String(dbBundle.price),
        priceEn: String(dbBundle.price),
        minutes: allowedMins,
        featuresAr: p.featuresAr.map(feat => {
          if (feat.includes('دقيقة') || feat.includes('د ')) {
            return p.id === 'free'
              ? `${allowedMins.toLocaleString()} دقيقة ذكاء اصطناعي تجريبية.`
              : `${allowedMins.toLocaleString()} دقيقة ذكاء اصطناعي شهرياً.`;
          }
          return feat;
        }),
        featuresEn: p.featuresEn.map(feat => {
          if (feat.toLowerCase().includes('minutes')) {
            return p.id === 'free'
              ? `${allowedMins.toLocaleString()} minutes of AI trial access.`
              : `${allowedMins.toLocaleString()} AI minutes per month.`;
          }
          return feat;
        })
      };
    }
    return p;
  });
};
