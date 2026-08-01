import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PLANS } from '../data/plans';

export default function Dashboard({ setActivePage }) {
  const { currentUser, appointments, patients } = useApp();
  const { t, isArabic } = useLanguage();
  const [subscription, setSubscription] = useState(null);
  const [showAllToday, setShowAllToday] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const response = await fetch(`/api/v1/subscriptions/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok && response.status !== 204) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (err) {
        console.error("Failed to fetch subscription in Dashboard:", err);
      }
    };
    fetchSubscription();
  }, []);

  // Calculate remaining AI minutes
  const getRemainingMinutes = () => {
    if (!subscription) return 60; // Fallback to 60 for new users with trial
    const planNameLower = (subscription.bundle_name || '').toLowerCase();
    const matchedPlan = PLANS.find(p => 
      p.id === planNameLower || 
      p.nameEn.toLowerCase() === planNameLower || 
      (subscription.bundle_name_ar && p.nameAr === subscription.bundle_name_ar)
    ) || PLANS[1]; // Fallback to starter
    
    const totalMinutes = matchedPlan.minutes || 1000;
    const usedMinutes = subscription.used_minutes || 0;
    return Math.max(totalMinutes - usedMinutes, 0);
  };

  const remainingMinutes = getRemainingMinutes();

  // Filter to today's appointments only
  const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const myAppts = appointments.filter(a => {
    if (a.doctor_id !== currentUser.id) return false;
    if (!a.appointment_date) return false;
    // appointment_date can be 'YYYY-MM-DD' or a full ISO string
    const apptDay = a.appointment_date.slice(0, 10);
    return apptDay === todayStr;
  });

  // Map patients to appointments for displaying
  const allTodayPatients = myAppts.map(appt => {
    const patientObj = patients.find(p => p.id === appt.patient_id);
    return {
      ...appt,
      patientName: patientObj ? patientObj.name : 'Unknown Patient',
      initials: patientObj ? patientObj.name.split(' ').map(n => n[0]).join('') : 'UN'
    };
  });

  const upcomingPatients = showAllToday ? allTodayPatients : allTodayPatients.slice(0, 3);

  // Build real activity feed from doctor's own data
  const buildActivityFeed = () => {
    const items = [];

    // Completed / summarized appointments → "أكملت جلسة مع ..."
    appointments
      .filter(a => a.doctor_id === currentUser.id && (a.status === 'completed' || a.status === 'summarized'))
      .forEach(a => {
        const p = patients.find(pt => pt.id === a.patient_id);
        items.push({
          id: `appt-done-${a.id}`,
          icon: 'task_alt',
          color: 'text-success',
          bg: 'bg-success/10',
          textAr: `اكتملت جلسة مع ${p?.name || 'مريض'}`,
          textEn: `Completed session with ${p?.name || 'Patient'}`,
          date: a.updated_at || a.created_at || a.appointment_date,
        });
      });

    // Scheduled / confirmed appointments → "حجزت موعداً جديداً مع ..."
    appointments
      .filter(a => a.doctor_id === currentUser.id && (a.status === 'scheduled' || a.status === 'confirmed'))
      .forEach(a => {
        const p = patients.find(pt => pt.id === a.patient_id);
        items.push({
          id: `appt-new-${a.id}`,
          icon: 'calendar_add_on',
          color: 'text-primary',
          bg: 'bg-primary/10',
          textAr: `موعد جديد مع ${p?.name || 'مريض'} — ${a.appointment_date || ''}`,
          textEn: `New appointment with ${p?.name || 'Patient'} — ${a.appointment_date || ''}`,
          date: a.created_at || a.appointment_date,
        });
      });

    // Sort by date descending, take latest 5
    items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return items.slice(0, 5);
  };

  const activityFeed = buildActivityFeed();

  const relativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return isArabic ? 'الآن' : 'Just now';
    if (diff < 60) return isArabic ? `منذ ${diff} دقيقة` : `${diff}m ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return isArabic ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return isArabic ? `منذ ${days} يوم` : `${days}d ago`;
  };

  return (
    <div className="text-start">
      {/* Header */}
      <header className="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 className="font-display-lg text-headline-lg text-on-surface font-bold">
            {t('dashboard')}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic 
              ? `أهلاً بك د. ${currentUser?.name || ''}، إليك نظرة سريعة على إحصائيات عيادتك اليوم.`
              : `Welcome Dr. ${currentUser?.name || ''}, here is a quick overview of your clinic statistics today.`}
          </p>
        </div>
        <div className="flex items-center gap-stack-md">
          <button 
            onClick={() => setActivePage('appointments')}
            className="bg-primary hover:bg-primary-hover text-on-primary font-button text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {isArabic ? 'موعد جديد' : 'New Appointment'}
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Quick Stats Row */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-md">
          {/* Stat Card 1 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                {t('today_appointments')}
              </p>
              <span className="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg">calendar_today</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">{myAppts.length}</h3>
              <span className="font-body-sm text-xs text-tertiary-container flex items-center">
                <span className={`material-symbols-outlined text-[16px] ${isArabic ? 'ml-1' : 'mr-1'}`}>trending_up</span> 
                {isArabic ? 'نشط' : 'Active'}
              </span>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                {isArabic ? 'الملخصات المكتملة' : 'Completed Summaries'}
              </p>
              <span className="material-symbols-outlined text-status-warning bg-surface-container-high p-2 rounded-lg">description</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                {appointments.filter(a => a.doctor_id === currentUser.id && a.status === 'completed').length}
              </h3>
              <span className="font-body-sm text-xs text-on-surface-variant">
                {isArabic ? 'ملاحظة طبية' : 'clinical notes'}
              </span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                {t('total_patients')}
              </p>
              <span className="material-symbols-outlined text-tertiary bg-tertiary-fixed p-2 rounded-lg">verified_user</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">{patients.length}</h3>
              <span className="font-body-sm text-xs text-tertiary-container flex items-center">
                <span className={`material-symbols-outlined text-[16px] ${isArabic ? 'ml-1' : 'mr-1'}`}>group</span>
                {isArabic ? 'مريض مسجل' : 'registered'}
              </span>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">
                {t('ai_credits')}
              </p>
              <span className="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg">payments</span>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                {isArabic ? `${remainingMinutes} دقيقة` : `${remainingMinutes} mins`}
              </h3>
              <span className="font-body-sm text-xs text-on-surface-variant">
                {isArabic ? 'متبقية' : 'remaining'}
              </span>
            </div>
          </div>
        </div>

        {/* Left Column: Upcoming Patients Today */}
        <div className="col-span-12 md:col-span-7 space-y-gutter">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  {isArabic ? 'المرضى القادمون اليوم' : "Today's Patients"}
                </h2>
                <p className="text-[10px] text-on-surface-variant mt-0.5 font-semibold">
                  {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={() => setActivePage('appointments')}
                className="text-primary hover:text-primary-hover font-button text-sm transition-colors font-bold"
              >
                {isArabic ? 'كل المواعيد' : 'All Appointments'}
              </button>
            </div>
            <div className="space-y-3">
              {allTodayPatients.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">event_available</span>
                  <p className="text-secondary text-sm font-semibold">
                    {isArabic ? 'لا توجد مواعيد لهذا اليوم' : 'No appointments scheduled for today'}
                  </p>
                </div>
              ) : (
                <>
                  {upcomingPatients.map((patient, idx) => (
                    <div 
                      key={patient.id} 
                      onClick={() => setActivePage('visits')}
                      className="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-xl transition-colors border border-transparent hover:border-border-subtle group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-button text-sm font-bold shrink-0 ${
                          patient.is_high_priority 
                            ? 'bg-error-container text-error' 
                            : 'bg-primary-light text-primary'
                        }`}>
                          {patient.initials}
                        </div>
                        <div>
                          <h4 className="font-button text-sm text-on-surface group-hover:text-primary transition-colors font-semibold">
                            {patient.patientName}
                          </h4>
                          <p className="font-body-sm text-xs text-on-surface-variant">
                            {patient.appointment_time && <span>{patient.appointment_time} • </span>}
                            {patient.description || (isArabic ? 'كشف عام' : 'General')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {patient.is_high_priority && (
                          <span className="px-2.5 py-1 bg-error-container text-error font-label-caps text-[10px] rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">priority_high</span> 
                            {isArabic ? 'عاجل' : 'Urgent'}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 font-label-caps text-[10px] rounded-full ${
                          patient.status === 'confirmed' || patient.status === 'scheduled'
                            ? 'bg-primary/10 text-primary font-bold'
                            : patient.status === 'completed'
                            ? 'bg-success/15 text-success font-bold'
                            : 'bg-surface-container-high text-secondary'
                        }`}>
                          {isArabic
                            ? patient.status === 'confirmed' || patient.status === 'scheduled' ? 'مجدول'
                              : patient.status === 'completed' ? 'مكتمل' : patient.status
                            : patient.status.toUpperCase()
                          }
                        </span>
                        <span className={`material-symbols-outlined text-secondary group-hover:text-primary transition-colors text-[20px] ${isArabic ? 'rotate-180' : ''}`}>chevron_right</span>
                      </div>
                    </div>
                  ))}

                  {/* Show More / Show Less */}
                  {allTodayPatients.length > 3 && (
                    <button
                      onClick={() => setShowAllToday(p => !p)}
                      className="w-full mt-1 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showAllToday ? 'expand_less' : 'expand_more'}
                      </span>
                      {showAllToday
                        ? (isArabic ? 'عرض أقل' : 'Show Less')
                        : (isArabic ? `عرض المزيد (${allTodayPatients.length - 3} آخرين)` : `Show More (${allTodayPatients.length - 3} more)`)
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant (LIGHT MODE ONLY) & Activity */}
        <div className="col-span-12 md:col-span-5 space-y-gutter">
          
          {/* AI Assistant Card - Swapped to a premium light teal/mint styled container */}
          <div className="bg-primary-light border-2 border-primary/20 rounded-xl p-stack-lg shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined fill">psychology</span>
              </div>
              <div>
                <h3 className="font-headline-md text-base text-primary font-bold mb-2">SBR AI Assistant</h3>
                <p className="font-body-sm text-sm text-secondary mb-4 leading-relaxed">
                  {isArabic 
                    ? 'لقد قمت بتحليل نتائج التحاليل الأخيرة الخاصة بمرضاك، ويوجد بعض التنبيهات التي قد تحتاج لمراجعتها.' 
                    : 'I have analyzed the recent lab results of your patients. There are some alerts that you might want to review.'}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setActivePage('visits')}
                    className="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-1.5 px-4 rounded-full transition-colors border border-primary shadow-sm font-bold"
                  >
                    {isArabic ? 'عرض التحليل' : 'View Analysis'}
                  </button>
                  <button className="bg-white hover:bg-surface-container-low text-secondary font-button text-xs py-1.5 px-4 rounded-full transition-colors border border-border-subtle shadow-sm font-bold">
                    {isArabic ? 'تجاهل' : 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <h2 className="font-button text-sm text-on-surface font-bold">
                {isArabic ? 'آخر النشاطات' : 'Recent Activity'}
              </h2>
              {activityFeed.length > 0 && (
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {activityFeed.length}
                </span>
              )}
            </div>

            {activityFeed.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">history</span>
                <p className="text-xs text-on-surface-variant font-semibold">
                  {isArabic ? 'لا توجد نشاطات حديثة' : 'No recent activity'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`material-symbols-outlined text-[16px] ${item.color}`}>{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-on-surface font-semibold leading-snug">
                        {isArabic ? item.textAr : item.textEn}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">
                        {relativeTime(item.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
