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
      <header className="flex justify-between items-center mb-4 md:mb-stack-lg border-b border-border-subtle pb-3 md:pb-stack-md">
        <div>
          <h1 className="text-xl md:font-display-lg md:text-headline-lg text-on-surface font-bold">
            {t('dashboard')}
          </h1>
          <p className="hidden md:block font-body-lg text-body-lg text-on-surface-variant mt-1">
            {isArabic 
              ? `أهلاً بك د. ${currentUser?.name || ''}، إليك نظرة سريعة على إحصائيات عيادتك اليوم.`
              : `Welcome Dr. ${currentUser?.name || ''}, here is a quick overview of your clinic statistics today.`}
          </p>
        </div>
        <div className="flex items-center gap-stack-md">
          <button 
            onClick={() => setActivePage('appointments')}
            className="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs md:text-sm py-1.5 md:py-2 px-3 md:px-4 rounded-lg transition-colors flex items-center justify-center gap-1 md:gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] md:text-[18px]">add</span>
            <span className="hidden sm:inline">{isArabic ? 'موعد جديد' : 'New Appointment'}</span>
            <span className="sm:hidden">{isArabic ? 'موعد' : 'Appt'}</span>
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Quick Stats Row - 2 cols on mobile, 4 on desktop */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-gutter mb-4 md:mb-stack-md">
          {/* Stat Card 1 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 md:p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wide leading-tight">
                {t('today_appointments')}
              </p>
              <span className="material-symbols-outlined text-[16px] md:text-[20px] text-primary bg-primary-light p-1.5 md:p-2 rounded-lg">calendar_today</span>
            </div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <h3 className="text-2xl md:text-3xl text-on-surface font-sans font-black leading-none">{myAppts.length}</h3>
              <span className="font-body-sm text-xs text-tertiary-container flex items-center">
                <span className={`material-symbols-outlined text-[14px] md:text-[16px] ${isArabic ? 'ml-0.5' : 'mr-0.5'}`}>trending_up</span>
                <span className="hidden sm:inline">{isArabic ? 'نشط' : 'Active'}</span>
              </span>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 md:p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wide leading-tight">
                {isArabic ? 'الملخصات' : 'Summaries'}
              </p>
              <span className="material-symbols-outlined text-[16px] md:text-[20px] text-status-warning bg-surface-container-high p-1.5 md:p-2 rounded-lg">description</span>
            </div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <h3 className="text-2xl md:text-3xl text-on-surface font-sans font-black leading-none">
                {appointments.filter(a => a.doctor_id === currentUser.id && a.status === 'completed').length}
              </h3>
              <span className="font-body-sm text-xs text-on-surface-variant hidden sm:inline">
                {isArabic ? 'ملاحظة' : 'notes'}
              </span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 md:p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wide leading-tight">
                {t('total_patients')}
              </p>
              <span className="material-symbols-outlined text-[16px] md:text-[20px] text-tertiary bg-tertiary-fixed p-1.5 md:p-2 rounded-lg">verified_user</span>
            </div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <h3 className="text-2xl md:text-3xl text-on-surface font-sans font-black leading-none">{patients.length}</h3>
              <span className="font-body-sm text-xs text-tertiary-container flex items-center hidden sm:flex">
                <span className={`material-symbols-outlined text-[14px] ${isArabic ? 'ml-0.5' : 'mr-0.5'}`}>group</span>
                {isArabic ? 'مريض' : 'patients'}
              </span>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-4 md:p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <p className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wide leading-tight">
                {t('ai_credits')}
              </p>
              <span className="material-symbols-outlined text-[16px] md:text-[20px] text-primary bg-primary-light p-1.5 md:p-2 rounded-lg">payments</span>
            </div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <h3 className="text-2xl md:text-3xl text-on-surface font-sans font-black leading-none">
                {remainingMinutes}
              </h3>
              <span className="font-body-sm text-xs text-on-surface-variant">
                {isArabic ? 'دقيقة' : 'mins'}
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
                <p className="text-xs text-on-surface-variant mt-0.5 font-semibold">
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
                          <h4 className="font-button text-base text-on-surface group-hover:text-primary transition-colors font-semibold">
                            {patient.patientName}
                          </h4>
                          <p className="font-body-sm text-sm text-on-surface-variant">
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
          


          {/* Recent Activity */}
          <div className="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <h2 className="font-button text-base text-on-surface font-bold">
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
                      <p className="text-sm text-on-surface font-semibold leading-snug">
                        {isArabic ? item.textAr : item.textEn}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
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
