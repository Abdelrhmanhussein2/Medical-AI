import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

const PLANS = [
  { id: 'basic', label: 'Basic Access', labelAr: 'الوصول الأساسي', price: 200 },
  { id: 'trial', label: 'Trial Access', labelAr: 'الوصول التجريبي', price: 0 },
  { id: 'clinical_pro', label: 'Clinical Pro', labelAr: 'السريري المتقدم', price: 500 },
  { id: 'pro_ai', label: 'Pro AI Suite', labelAr: 'باقة ذكاء اصطناعي برو', price: 900 },
  { id: 'enterprise', label: 'Enterprise AI', labelAr: 'الذكاء الاصطناعي للمؤسسات', price: 1500 },
];

export default function OrgSubscriptions() {
  const { currentUser, doctors, activateSubscription } = useApp();
  const { isArabic } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('all');
  const [orgSubscription, setOrgSubscription] = useState(null);

  // Load the org's own subscription
  useEffect(() => {
    const loadOrgSub = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        const res = await fetch('/api/v1/subscriptions/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrgSubscription(data || { bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
        } else {
          setOrgSubscription({ bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
        }
      } catch (e) {
        console.error('Failed to load org subscription', e);
        setOrgSubscription({ bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
      }
    };
    loadOrgSub();
  }, []);

  // Subscribe modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('pro_ai');
  const [expiryDate, setExpiryDate] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  // All doctors in state are already scoped to this department
  const deptDocs = doctors;

  // Build license info
  const docLicenses = deptDocs.map(doc => {
    const expiryDateVal = doc.subscription_expiry || null;
    let licenseStatus = doc.status === 'pending' ? 'pending' : 'active';
    let daysRemaining = null;

    if (expiryDateVal) {
      const today = new Date();
      const expiry = new Date(expiryDateVal);
      daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        licenseStatus = 'expired';
      } else if (daysRemaining <= 30) {
        licenseStatus = 'expiring';
      } else {
        licenseStatus = 'active';
      }
    } else if (doc.status === 'pending' || doc.status === 'rejected') {
      licenseStatus = 'pending';
    }

    return {
      id: doc.id,
      doctorName: doc.name,
      doctorEmail: doc.email,
      // Use org's plan if doctor has no individual plan
      planTier: doc.subscription_plan || (orgSubscription ? orgSubscription.bundle_name : null) || '—',
      renewalDate: expiryDateVal ? new Date(expiryDateVal).toLocaleDateString() : (orgSubscription?.end_date ? new Date(orgSubscription.end_date).toLocaleDateString() : '—'),
      daysRemaining,
      status: licenseStatus,
      rawDoc: doc
    };
  });

  const filteredLicenses = docLicenses.filter(license => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return license.status === 'pending';
    if (filterStatus === 'active') return license.status === 'active';
    if (filterStatus === 'expiring') return license.status === 'expiring';
    if (filterStatus === 'expired') return license.status === 'expired';
    return true;
  });

  const seatsUtilized = deptDocs.filter(d => d.status === 'approved').length;
  const totalSeats = deptDocs.length || 0;
  const capacityPct = totalSeats > 0 ? Math.round((seatsUtilized / totalSeats) * 100) : 0;
  const pendingCount = docLicenses.filter(l => l.status === 'pending').length;
  const expiringSoonCount = docLicenses.filter(l => l.status === 'expiring').length;

  const openSubscribeModal = (license) => {
    setSelectedDoc(license);
    setSelectedPlan('pro_ai');
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setExpiryDate(d.toISOString().split('T')[0]);
    setSubError('');
    setShowSubModal(true);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    setSubError('');
    try {
      const planLabel = PLANS.find(p => p.id === selectedPlan)?.label || selectedPlan;
      await activateSubscription(selectedDoc.id, planLabel, expiryDate);
      setShowSubModal(false);
    } catch (err) {
      setSubError(err.message || (isArabic ? 'فشل تفعيل الاشتراك' : 'Failed to activate subscription'));
    } finally {
      setSubLoading(false);
    }
  };

  const statusBadge = (status, daysRemaining) => {
    const classes = {
      active: 'bg-primary-light text-primary',
      expiring: 'bg-status-warning/10 text-status-warning',
      expired: 'bg-error-container text-error',
      pending: 'bg-surface-container-high text-secondary',
    };
    
    let label = status;
    if (isArabic) {
      const labelsAr = {
        active: `نشط${daysRemaining !== null ? ` (${daysRemaining} يوم)` : ''}`,
        expiring: `ينتهي قريباً (${daysRemaining} يوم)`,
        expired: 'منتهي',
        pending: 'في انتظار التفعيل',
      };
      label = labelsAr[status] || status;
    } else {
      const labelsEn = {
        active: `Active${daysRemaining !== null ? ` (${daysRemaining}d)` : ''}`,
        expiring: `Expiring Soon (${daysRemaining}d)`,
        expired: 'Expired',
        pending: 'Pending Activation',
      };
      label = labelsEn[status] || status;
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${classes[status] || ''}`}>
        {label}
      </span>
    );
  };

  const getPlanLabel = (plan) => {
    if (!isArabic) return plan;
    const map = {
      'Basic Access': 'الوصول الأساسي',
      'Trial Access': 'الوصول التجريبي',
      'Clinical Pro': 'السريري المتقدم',
      'Pro AI Suite': 'باقة ذكاء اصطناعي برو',
      'Enterprise AI': 'الذكاء الاصطناعي للمؤسسات',
    };
    return map[plan] || plan;
  };

  return (
    <div className={`space-y-stack-lg font-body-md animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <header className="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <div className={`flex items-center gap-1.5 text-xs text-secondary font-semibold ${isArabic ? 'flex-row-reverse' : ''}`}>
            <span>{currentUser.name}</span>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>{isArabic ? 'الاشتراكات' : 'Subscriptions'}</span>
          </div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold mt-1">
            {isArabic ? 'اشتراكات القسم' : 'Department Subscriptions'}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic
              ? 'إدارة توزيع مقاعد الأطباء الممارسين وتفعيل حسابات الأطباء.'
              : 'Manage clinician seat allocation and activate doctor accounts.'}
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
            {isArabic ? 'إجمالي استخدام المقاعد' : 'Total Seat Utilization'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-on-surface font-display-lg">{seatsUtilized} / {totalSeats}</span>
            <span className="text-xs font-semibold text-primary">
              {capacityPct}% {isArabic ? 'نشط' : 'active'}
            </span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-2">
            <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${capacityPct}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-status-warning/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
            {isArabic ? 'في انتظار التفعيل' : 'Pending Activation'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold font-display-lg ${pendingCount > 0 ? 'text-status-warning' : 'text-on-surface'}`}>{pendingCount}</span>
            <span className="text-xs font-semibold text-status-warning">
              {pendingCount > 0 
                ? (isArabic ? 'يحتاج اشتراك' : 'Needs Subscription') 
                : (isArabic ? 'الكل نشط' : 'All Active')}
            </span>
          </div>
        </div>

        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-error/5 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
            {isArabic ? 'التراخيص التي تنتهي قريباً (30 يوم)' : 'Expiring Licenses (30d)'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold font-display-lg ${expiringSoonCount > 0 ? 'text-error' : 'text-on-surface'}`}>{expiringSoonCount}</span>
            <span className="text-xs font-semibold text-error">
              {expiringSoonCount > 0 
                ? (isArabic ? 'مراجعة التجديدات' : 'Review Renewals') 
                : (isArabic ? 'لا يوجد' : 'None')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row justify-start gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={`bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
        >
          <option value="all">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
          <option value="pending">{isArabic ? 'في انتظار التفعيل' : 'Pending Activation'}</option>
          <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
          <option value="expiring">{isArabic ? 'ينتهي قريباً' : 'Expiring Soon'}</option>
          <option value="expired">{isArabic ? 'منتهي' : 'Expired'}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table className={`min-w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
          <thead className="bg-bg-canvas">
            <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الطبيب / الممارس' : 'Doctor / Clinician'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الخطة الحالية' : 'Current Plan'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">{isArabic ? 'الحالة' : 'Status'}</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">{isArabic ? 'إجراءات' : 'Actions'}</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border-subtle text-xs">
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-secondary text-sm">
                  {isArabic ? 'لم يتم العثور على أطباء' : 'No doctors found'}
                </td>
              </tr>
            ) : (
              filteredLicenses.map((license) => (
                <tr key={license.id} className={`hover:bg-surface-container-low transition-colors ${license.status === 'pending' ? 'bg-status-warning/5' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                        {license.doctorName?.[0] || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-on-surface">{license.doctorName}</div>
                        <div className="text-[10px] text-secondary">{license.doctorEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {license.planTier && license.planTier !== '—' ? (
                      <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full">
                        <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
                        {getPlanLabel(license.planTier)}
                      </span>
                    ) : (
                      <span className="text-secondary font-semibold text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {license.renewalDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(license.status, license.daysRemaining)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <div className={`flex ${isArabic ? 'justify-start' : 'justify-end'}`}>
                      {(license.status === 'pending' || license.status === 'expired' || license.status === 'expiring') && (
                        <button
                          onClick={() => openSubscribeModal(license)}
                          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">subscriptions</span>
                          {license.status === 'pending'
                            ? (isArabic ? 'تفعيل الاشتراك' : 'Activate Subscription')
                            : (isArabic ? 'تجديد' : 'Renew')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Subscribe Modal */}
      {showSubModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isArabic ? 'تفعيل الاشتراك' : 'Activate Subscription'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {isArabic ? `للطبيب د. ${selectedDoc.doctorName}` : `for Dr. ${selectedDoc.doctorName}`}
                </p>
              </div>
              <button onClick={() => setShowSubModal(false)} className="p-1 hover:bg-surface-container rounded-full text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleActivate} className="p-6 space-y-4 text-start">
              {subError && (
                <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {subError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  {isArabic ? 'اختر الخطة' : 'Choose Plan'}
                </label>
                <div className="space-y-2">
                  {PLANS.map(plan => (
                    <label
                      key={plan.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlan === plan.id
                          ? 'border-primary bg-primary-light'
                          : 'border-border-subtle hover:bg-surface-container-low'
                      } ${isArabic ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="radio" name="plan" value={plan.id}
                          checked={selectedPlan === plan.id}
                          onChange={() => setSelectedPlan(plan.id)}
                          className="accent-primary"
                        />
                        <span className="text-xs font-semibold text-on-surface">
                          {isArabic ? plan.labelAr : plan.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {plan.price === 0 
                          ? (isArabic ? 'مجاني' : 'Free') 
                          : `${plan.price} ${isArabic ? 'ريال/شهر' : 'SAR/mo'}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'تاريخ انتهاء الاشتراك *' : 'Subscription Expiry Date *'}
                </label>
                <input
                  type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button" onClick={() => setShowSubModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit" disabled={subLoading}
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {subLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                      {isArabic ? 'جاري التفعيل...' : 'Activating...'}
                    </>
                  ) : (
                    isArabic ? 'تفعيل وتمكين الطبيب' : 'Activate & Enable Doctor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
