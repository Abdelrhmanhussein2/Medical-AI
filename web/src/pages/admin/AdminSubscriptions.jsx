import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminSubscriptions() {
  const { subscriptions, renewSubscription } = useApp();
  const { isArabic } = useLanguage();
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Renewal Modal state
  const [selectedSub, setSelectedSub] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [allowedMinutes, setAllowedMinutes] = useState(1500);
  const [customMessages, setCustomMessages] = useState('');
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  const filteredSubs = (subscriptions || []).filter(sub => {
    const matchesSearch =
      (sub.entity_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.plan_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || sub.entity_type === filterType;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeLicenses = (subscriptions || []).filter(sub => sub.status === 'active').length;
  const expiringCount = (subscriptions || []).filter(sub => sub.status === 'active' && sub.days_remaining <= 7 && sub.days_remaining > 0).length;
  const expiredCount = (subscriptions || []).filter(sub => sub.status === 'expired' || sub.days_remaining <= 0).length;
  const totalMRR = (subscriptions || []).reduce((sum, sub) => sum + (sub.status === 'active' ? sub.monthly_cost : 0), 0);

  const statusLabel = (status) => {
    if (!isArabic) return status;
    const map = { active: 'نشط', expiring: 'ينتهي قريباً', expired: 'منتهي' };
    return map[status] || status;
  };
  const paymentLabel = (status) => {
    if (!isArabic) return status;
    const map = { paid: 'مدفوع', pending: 'معلّق', overdue: 'متأخر' };
    return map[status] || status;
  };

  const openRenewModal = (sub) => {
    setSelectedSub(sub);
    setAllowedMinutes(sub.allowed_minutes || 1500);
    setCustomMessages('');
    setDaysToAdd(30);
    setSubError('');
    setShowModal(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    setSubError('');
    setSubLoading(true);
    try {
      await renewSubscription(selectedSub.id, {
        days_to_add: Number(daysToAdd) || 30,
        allowed_minutes: allowedMinutes ? Number(allowedMinutes) : null,
        daily_message_limit: customMessages ? Number(customMessages) : null
      });
      setShowModal(false);
      setSelectedSub(null);
    } catch (err) {
      setSubError(err.message || (isArabic ? 'فشل تجديد الاشتراك' : 'Failed to renew subscription'));
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <div className={`space-y-stack-lg font-body-md animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <header className="flex justify-between items-center border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {isArabic ? 'حالة الاشتراكات' : 'Subscription Health'}
          </h1>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {[
          { labelAr: 'التراخيص النشطة', labelEn: 'Active Licenses', value: activeLicenses, subAr: 'نشطة الآن', subEn: 'active now', subClass: 'text-primary', icon: 'trending_up' },
          { labelAr: 'تنتهي (7 أيام)', labelEn: 'Expiring (7 days)', value: expiringCount, subAr: 'يتطلب إجراء', subEn: 'Action Required', subClass: 'text-status-warning', icon: null },
          { labelAr: 'خطط منتهية', labelEn: 'Expired Plans', value: expiredCount, subAr: 'يتطلب مراجعة', subEn: 'requires attention', subClass: 'text-error', icon: null },
          { labelAr: 'الإيرادات الشهرية', labelEn: 'Monthly MRR', value: `$${totalMRR.toLocaleString()}`, subAr: `السنوي: $${(totalMRR * 12).toLocaleString()}`, subEn: `ARR: $${(totalMRR * 12).toLocaleString()}`, subClass: 'text-secondary', icon: null },
        ].map(({ labelAr, labelEn, value, subAr, subEn, subClass, icon }, i) => (
          <div key={i} className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              {isArabic ? labelAr : labelEn}
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-3xl font-bold text-on-surface font-display-lg shrink-0">{value}</span>
              <span className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${subClass}`}>
                {icon && <span className="material-symbols-outlined text-xs">{icon}</span>}
                {isArabic ? subAr : subEn}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and search panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
          >
            <option value="all">{isArabic ? 'جميع الأنواع' : 'All Entity Types'}</option>
            <option value="doctor">{isArabic ? 'الأطباء فقط' : 'Doctors Only'}</option>
            <option value="org">{isArabic ? 'المنظمات فقط' : 'Organizations Only'}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold ${isArabic ? 'text-right' : 'text-left'}`}
          >
            <option value="all">{isArabic ? 'جميع الاشتراكات' : 'All Subscriptions'}</option>
            <option value="active">{isArabic ? 'نشطة' : 'Active'}</option>
            <option value="expiring">{isArabic ? 'تنتهي قريباً' : 'Expiring Soon'}</option>
            <option value="expired">{isArabic ? 'منتهية' : 'Expired'}</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <span className={`material-symbols-outlined absolute ${isArabic ? 'right-2.5' : 'left-2.5'} top-1/2 transform -translate-y-1/2 text-secondary text-lg`}>search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'ابحث عن الحساب أو الخطة...' : 'Search account name or plan...'}
            className={`w-full ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm`}
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table className={`min-w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
          <thead className="bg-bg-canvas">
            <tr>
              {[
                { ar: 'الحساب', en: 'Account / Entity' },
                { ar: 'النوع', en: 'Type' },
                { ar: 'تفاصيل الخطة', en: 'Plan Details' },
                { ar: 'الأيام المتبقية', en: 'Days Left' },
                { ar: 'الدفع', en: 'Payment' },
                { ar: 'الحالة', en: 'Status' },
              ].map(({ ar, en }) => (
                <th key={en} scope="col" className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                  {isArabic ? ar : en}
                </th>
              ))}
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">{isArabic ? 'إجراءات' : 'Actions'}</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border-subtle text-xs">
            {filteredSubs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-secondary text-sm">
                  {isArabic ? 'لا توجد سجلات اشتراك' : 'No subscription records found'}
                </td>
              </tr>
            ) : (
              filteredSubs.map((sub) => (
                <tr key={sub.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-on-surface text-xs">{sub.entity_name}</div>
                    <div className="text-[10px] text-secondary">
                      {isArabic ? 'تاريخ الانتهاء:' : 'Expiry Date:'} {sub.expiry_date}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sub.entity_type === 'org' ? 'bg-primary-light text-primary' : 'bg-surface-container-high text-secondary'
                    }`}>
                      {sub.entity_type === 'org' ? (isArabic ? 'منظمة' : 'Organization') : (isArabic ? 'طبيب' : 'Doctor')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-on-surface">{sub.plan_name}</div>
                    <div className="text-[10px] text-secondary">
                      ${sub.monthly_cost}/{isArabic ? 'شهر متكرر' : 'month recurring'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-secondary font-bold">
                    {sub.status === 'expired' ? (
                      <span className="text-error">{isArabic ? '0 يوم (منتهي)' : '0 days (Expired)'}</span>
                    ) : (
                      <span>{sub.days_remaining} {isArabic ? 'يوم متبقي' : 'days left'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sub.payment_status === 'paid'
                        ? 'bg-primary-light text-primary'
                        : sub.payment_status === 'pending'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-error-container text-error'
                    }`}>
                      {paymentLabel(sub.payment_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      sub.status === 'active'
                        ? 'bg-primary-light text-primary'
                        : sub.status === 'expiring'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-error-container text-error'
                    }`}>
                      {statusLabel(sub.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                    <div className={`flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => openRenewModal(sub)}
                        className="px-3 py-1.5 rounded bg-primary hover:bg-primary-hover text-on-primary transition-colors text-xs font-bold shadow-sm cursor-pointer"
                      >
                        {isArabic ? 'تجديد وتخصيص' : 'Renew & Customize'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Renewal & Customization Modal */}
      {showModal && selectedSub && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-xl max-w-md w-full overflow-hidden animate-fade-in text-start">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="font-bold text-base text-on-surface">
                  {isArabic ? 'تجديد وتخصيص الاشتراك' : 'Renew & Customize Subscription'}
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  {selectedSub.entity_name} — ({selectedSub.plan_name})
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-surface-container rounded-full text-secondary">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
              {subError && (
                <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {subError}
                </div>
              )}

              {/* Voice Minutes Limit */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isArabic ? 'عدد الدقائق الصوتية المسموحة (دقيقة)' : 'Allowed Voice Minutes (Min)'}
                </label>
                <input
                  type="number"
                  value={allowedMinutes}
                  onChange={(e) => setAllowedMinutes(e.target.value)}
                  placeholder="1500"
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary ${isArabic ? 'text-right' : 'text-left'}`}
                />
                <p className="text-[10px] text-secondary mt-1">
                  {isArabic ? 'الأمثلة الشائعة: 1500 (Starter), 3000 (Pro), 5000 (Business), 8000 (Enterprise)' : 'Presets: 1,500 (Starter), 3,000 (Pro), 5,000 (Business), 8,000 (Enterprise)'}
                </p>
              </div>

              {/* Chat Message Daily Limit */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isArabic ? 'الحد الأقصى لرسائل الدردشة اليومي (رسالة) - اختياري' : 'Daily Chat Message Limit (Optional)'}
                </label>
                <input
                  type="number"
                  value={customMessages}
                  onChange={(e) => setCustomMessages(e.target.value)}
                  placeholder={isArabic ? 'مثال: 100' : 'e.g. 100'}
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Days to Add */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  {isArabic ? 'مدة التجديد (بالأيام)' : 'Extension Period (Days)'}
                </label>
                <input
                  type="number"
                  value={daysToAdd}
                  onChange={(e) => setDaysToAdd(e.target.value)}
                  placeholder="30"
                  className={`w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Actions */}
              <div className={`flex gap-3 mt-6 pt-4 border-t border-border-subtle ${isArabic ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white border border-border-subtle text-secondary py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold cursor-pointer"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={subLoading}
                  className="flex-1 bg-primary hover:bg-primary-hover text-on-primary py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {subLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                      {isArabic ? 'جاري التجديد...' : 'Renewing...'}
                    </>
                  ) : (
                    isArabic ? 'تأكيد وحفظ التجديد' : 'Confirm & Save'
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
