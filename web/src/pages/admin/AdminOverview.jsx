import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminOverview({ setActivePage }) {
  const { organizations, doctors, subscriptions, toggleOrgStatus } = useApp();
  const { isArabic } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDoctors = doctors.length;
  const activeSubs = organizations.filter(o => o.status === 'active').length +
                     doctors.filter(d => d.status === 'approved' && !d.department_id).length;
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === 'active').length;
  const aiUsageAvg = doctors.length > 0
    ? Math.round(doctors.reduce((sum, d) => sum + (d.ai_adoption || 0), 0) / doctors.length)
    : 0;

  const adminLogs = [];
  organizations.forEach(org => {
    adminLogs.push({
      id: `org-${org.id}`,
      icon: 'corporate_fare',
      iconClass: 'text-primary bg-primary-light',
      textAr: `تم تسجيل مؤسسة ${org.name}`,
      textEn: `${org.name} department registered`,
      time: isArabic ? 'مؤخراً' : 'Recently',
      timestamp: Date.now() - 3600000
    });
  });
  doctors.forEach(doc => {
    adminLogs.push({
      id: `doc-${doc.id}`,
      icon: 'person_add',
      iconClass: 'text-primary bg-primary-light',
      textAr: `د. ${doc.name} انضم إلى ${doc.department || 'مستقل'}`,
      textEn: `Dr. ${doc.name} joined ${doc.department || 'Independent'}`,
      time: isArabic ? 'مؤخراً' : 'Recently',
      timestamp: Date.now() - 7200000
    });
  });
  adminLogs.sort((a, b) => b.timestamp - a.timestamp);

  const displayLogs = adminLogs.length > 0 ? adminLogs : [{
    id: 'init-log',
    icon: 'info',
    iconClass: 'text-secondary bg-surface-container',
    textAr: 'تم تهيئة نظام SBR AI بنجاح',
    textEn: 'SBR AI System initialized successfully',
    time: isArabic ? 'الآن' : 'Just now'
  }];

  return (
    <div className={`space-y-stack-lg font-body-md animate-fade-in ${isArabic ? 'text-right' : 'text-left'}`}>
      {/* Header */}
      <header className="flex justify-between items-center border-b border-border-subtle pb-4">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {isArabic ? 'نظرة عامة على المنظمات' : 'Organization Overview'}
          </h1>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {[
          { labelAr: 'إجمالي الأطباء', labelEn: 'Total Doctors', value: totalDoctors, sub: isArabic ? '+0 هذا الشهر' : '+0 this month', subClass: 'text-primary', icon: 'trending_up' },
          { labelAr: 'الاشتراكات النشطة', labelEn: 'Active Subscriptions', value: activeSubs, sub: isArabic ? '0 تنتهي قريباً' : '0 expiring', subClass: 'text-status-warning', icon: 'schedule' },
          { labelAr: 'متوسط استخدام AI', labelEn: 'AI Usage Avg', value: `${aiUsageAvg}%`, sub: isArabic ? 'أعلى أداء' : 'Top performing', subClass: 'text-primary', icon: null },
          { labelAr: 'المنظمات المسجلة', labelEn: 'Registered Orgs', value: totalOrgs, sub: isArabic ? `${activeOrgs} نشطة` : `${activeOrgs} active`, subClass: 'text-primary', icon: 'done_all' },
        ].map(({ labelAr, labelEn, value, sub, subClass, icon }, i) => (
          <div key={i} className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              {isArabic ? labelAr : labelEn}
            </span>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-3xl font-bold text-on-surface font-display-lg shrink-0">{value}</span>
              <span className={`text-xs font-semibold flex items-center gap-1 shrink-0 ${subClass}`}>
                {icon && <span className="material-symbols-outlined text-xs">{icon}</span>}
                {sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Organizations Table */}
        <div className="lg:col-span-8 bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-canvas">
              <h3 className="font-button text-sm text-on-surface font-bold">
                {isArabic ? 'المنظمات المسجلة' : 'Registered Organizations'}
              </h3>
              <div className="relative w-full sm:w-64">
                <span className={`material-symbols-outlined absolute ${isArabic ? 'right-2.5' : 'left-2.5'} top-1/2 transform -translate-y-1/2 text-secondary text-lg`}>search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isArabic ? 'ابحث عن منظمة أو تخصص...' : 'Search org or specialty...'}
                  className={`w-full ${isArabic ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full divide-y divide-border-subtle ${isArabic ? 'text-right' : 'text-left'}`}>
                <thead className="bg-bg-canvas/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'المنظمة' : 'Organization'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'التخصص' : 'Specialty'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'الأطباء' : 'Doctors'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'الاشتراك' : 'Subscription'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'الحالة' : 'Status'}
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">
                      {isArabic ? 'الإجراء' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border-subtle text-xs">
                  {filteredOrgs.map((org) => {
                    const assignedCount = doctors.filter(d => d.department_id === org.id).length;
                    return (
                      <tr key={org.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col space-y-0.5 text-start">
                            <div className="font-bold text-on-surface text-xs leading-snug">{org.name}</div>
                            <div className="text-xs text-secondary leading-snug truncate max-w-[180px]">{org.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary font-semibold">{org.specialty}</td>
                        <td className="px-4 py-3 text-secondary font-bold">
                          {assignedCount} {isArabic ? 'مُعين' : 'assigned'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col space-y-0.5 text-start">
                            <div className="font-bold text-primary text-xs leading-snug">{org.subscription_plan}</div>
                            {org.subscription_expiry && (
                              <div className="text-xs text-secondary leading-snug">
                                {isArabic ? `ينتهي: ${org.subscription_expiry}` : `Expires: ${org.subscription_expiry}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize whitespace-nowrap ${
                            (org.status === 'active' || org.is_active) ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                          }`}>
                            {(org.status === 'active' || org.is_active) ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Suspended')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <div className={`flex gap-2 ${isArabic ? 'justify-start' : 'justify-end'}`}>
                            <button
                              onClick={() => toggleOrgStatus(org.id)}
                              className={`px-2.5 py-1 rounded transition-colors text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                                (org.status === 'active' || org.is_active)
                                  ? 'bg-error-container/10 hover:bg-error-container text-error'
                                  : 'bg-primary-light text-primary hover:bg-primary/20'
                              }`}
                            >
                              {(org.status === 'active' || org.is_active)
                                ? (isArabic ? 'إيقاف' : 'Suspend')
                                : (isArabic ? 'تفعيل' : 'Activate')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`p-4 border-t border-border-subtle bg-bg-canvas/30 ${isArabic ? 'text-left' : 'text-right'}`}>
            <button
              onClick={() => setActivePage('admin-users')}
              className={`text-xs font-bold text-primary hover:underline flex items-center gap-1 ${isArabic ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
            >
              {isArabic ? 'إدارة جميع الأقسام والمستخدمين' : 'Manage all departments and users'}
              <span className={`material-symbols-outlined text-xs ${isArabic ? 'rotate-180' : ''}`}>arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 bg-white border border-border-subtle rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              {isArabic ? 'سجل الأنشطة الإدارية' : 'Administrative Log'}
            </h3>
            <div className={`space-y-4 text-xs leading-relaxed max-h-[360px] overflow-y-auto ${isArabic ? 'pl-2' : 'pr-2'}`}>
              {displayLogs.map(log => (
                <div key={log.id} className="flex gap-3 items-start text-start">
                  <span className={`material-symbols-outlined p-2 rounded-lg shrink-0 ${log.iconClass}`}>{log.icon}</span>
                  <div className="flex flex-col text-start">
                    <p className="font-bold text-on-surface text-xs leading-tight">{isArabic ? log.textAr : log.textEn}</p>
                    <span className="text-xs text-secondary mt-0.5">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4 mt-4">
            <button
              onClick={() => setActivePage('admin-subscriptions')}
              className="w-full text-center py-2 bg-bg-canvas hover:bg-surface-container rounded-lg text-xs font-bold text-secondary transition-colors"
            >
              {isArabic ? 'مراجعة الفواتير والتراخيص' : 'Review Billing & Licenses'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
