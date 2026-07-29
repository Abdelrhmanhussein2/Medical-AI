import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

const PLANS = [
  { id: 'business', label: 'SBR AI Business', labelAr: 'SBR AI Business', price: 449, minutes: 3500 },
  { id: 'enterprise', label: 'SBR AI Enterprise', labelAr: 'SBR AI Enterprise', price: 599, minutes: 5000 },
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
          setOrgSubscription(data || { bundle_name: 'SBR AI Business', end_date: '2026-12-31' });
        } else {
          setOrgSubscription({ bundle_name: 'SBR AI Business', end_date: '2026-12-31' });
        }
      } catch (e) {
        console.error('Failed to load org subscription', e);
        setOrgSubscription({ bundle_name: 'SBR AI Business', end_date: '2026-12-31' });
      }
    };
    loadOrgSub();
  }, []);

  // Subscribe modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('business');
  const [expiryDate, setExpiryDate] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  // Doctor custom limits input states
  const [customMinutes, setCustomMinutes] = useState('');
  const [customTokens, setCustomTokens] = useState('');

  // Org Renewal Modal States
  const [showOrgRenewModal, setShowOrgRenewModal] = useState(false);
  const [selectedBundleId, setSelectedBundleId] = useState('');
  const [orgBundles, setOrgBundles] = useState([]);
  const [loadingBundles, setLoadingBundles] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Load department bundles from API
  useEffect(() => {
    const fetchOrgBundles = async () => {
      setLoadingBundles(true);
      try {
        const token = sessionStorage.getItem('accessToken');
        const res = await fetch('/api/v1/subscriptions/bundles?target_type=department', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrgBundles(data || []);
          if (data && data.length > 0) {
            setSelectedBundleId(data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to fetch department bundles', e);
      } finally {
        setLoadingBundles(false);
      }
    };
    fetchOrgBundles();
  }, []);

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formattedValue);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  const handleOrgRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBundleId) {
      setRenewError(isArabic ? 'الرجاء اختيار باقة الاشتراك.' : 'Please select a subscription plan.');
      return;
    }

    setRenewLoading(true);
    setRenewError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch('/api/v1/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bundle_id: selectedBundleId })
      });
      if (res.ok) {
        const newSub = await res.json();
        setOrgSubscription(newSub);
        setShowOrgRenewModal(false);
        alert(isArabic ? 'تم تجديد الاشتراك وتفعيل الباقة بنجاح!' : 'Subscription renewed and plan activated successfully!');
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || (isArabic ? 'فشل تجديد الاشتراك' : 'Failed to renew subscription'));
      }
    } catch (err) {
      setRenewError(err.message);
    } finally {
      setRenewLoading(false);
    }
  };

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
    setSelectedPlan('business');
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setExpiryDate(d.toISOString().split('T')[0]);
    setSubError('');
    setCustomMinutes('');
    setCustomTokens('');
    setShowSubModal(true);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    setSubError('');
    try {
      const planLabel = orgSubscription?.bundle_name || 'SBR AI Business';
      await activateSubscription(
        selectedDoc.id, 
        planLabel, 
        expiryDate,
        customMinutes ? parseInt(customMinutes, 10) : null,
        customTokens ? parseInt(customTokens, 10) : null
      );
      setShowSubModal(false);
      alert(isArabic ? 'تم تفعيل حساب الطبيب وتعيين صلاحيات الاستهلاك المخصصة بنجاح!' : 'Doctor activated and custom consumption limits set successfully!');
      window.location.reload();
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
      <header className={`flex justify-between items-end border-b border-border-subtle pb-stack-md ${isArabic ? 'flex-row-reverse' : ''}`}>
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
        
        <button
          onClick={() => setShowOrgRenewModal(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">credit_card</span>
          {isArabic ? 'تجديد أو ترقية الاشتراك' : 'Renew or Upgrade Subscription'}
        </button>
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
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'تاريخ انتهاء الاشتراك *' : 'Subscription Expiry Date *'}
                </label>
                <input
                  type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'الحد الأقصى لدقائق الذكاء الاصطناعي للطبيب (دقائق) - اختياري' : 'Custom AI Minutes Limit (Optional)'}
                </label>
                <input
                  type="number" placeholder={isArabic ? "مثال: 1000 (اتركه فارغاً لاستخدام كامل رصيد الباقة)" : "e.g., 1000 (leave blank for unlimited/full package)"}
                  value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isArabic ? 'الحد الأقصى لتوكنز الدردشة اليومي (توكن) - اختياري' : 'Custom Daily Chat Tokens Limit (Optional)'}
                </label>
                <input
                  type="number" placeholder={isArabic ? "مثال: 50000" : "e.g., 50000"}
                  value={customTokens} onChange={(e) => setCustomTokens(e.target.value)}
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
      {/* Org Renew Modal */}
      {showOrgRenewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-lg w-full overflow-hidden animate-fade-in text-start">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="font-headline-md text-base text-primary font-bold">
                  {isArabic ? 'تجديد أو ترقية الاشتراك للمنظمة' : 'Renew or Upgrade Org Subscription'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {isArabic ? 'اختر باقة المستشفى/العيادة وأدخل بيانات الدفع' : 'Choose hospital/clinic plan and enter payment details'}
                </p>
              </div>
              <button onClick={() => setShowOrgRenewModal(false)} className="p-1 hover:bg-surface-container rounded-full text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleOrgRenewSubmit} className="p-6 space-y-4 text-start">
              {renewError && (
                <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {renewError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  {isArabic ? 'اختر الباقة المناسبة للعيادة' : 'Choose Department Plan'}
                </label>
                {loadingBundles ? (
                  <div className="text-center py-4 text-xs text-secondary flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    {isArabic ? 'جاري تحميل الباقات المتاحة...' : 'Loading available plans...'}
                  </div>
                ) : orgBundles.length === 0 ? (
                  <div className="text-center py-4 text-xs text-secondary">
                    {isArabic ? 'لا توجد باقات متاحة حالياً.' : 'No plans available currently.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgBundles.map(bundle => (
                      <label
                        key={bundle.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBundleId === bundle.id
                            ? 'border-primary bg-primary-light font-bold'
                            : 'border-border-subtle hover:bg-surface-container-low'
                        } ${isArabic ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`flex items-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <input
                            type="radio" name="orgPlan" value={bundle.id}
                            checked={selectedBundleId === bundle.id}
                            onChange={() => setSelectedBundleId(bundle.id)}
                            className="accent-primary"
                          />
                          <div>
                            <span className="text-xs font-bold text-on-surface block">
                              {isArabic ? (bundle.name_ar || bundle.name) : bundle.name}
                            </span>
                            <span className="text-[10px] text-secondary">
                              {isArabic ? `الحد الأقصى: ${bundle.max_doctors} أطباء` : `Limit: ${bundle.max_doctors} doctors`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary font-display-sm">
                          {bundle.price} {isArabic ? 'ريال/شهرياً' : 'SAR/mo'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>



              <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button" onClick={() => setShowOrgRenewModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit" disabled={renewLoading || loadingBundles || orgBundles.length === 0}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {renewLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                      {isArabic ? 'جاري معالجة الدفع...' : 'Processing...'}
                    </>
                  ) : (
                    isArabic ? 'دفع وتفعيل الاشتراك' : 'Pay & Activate Plan'
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
