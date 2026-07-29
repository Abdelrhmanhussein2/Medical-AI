import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PLANS } from '../data/plans';

export default function Dashboard({ setActivePage }) {
  const { currentUser, appointments, patients } = useApp();
  const { t, isArabic } = useLanguage();
  const [subscription, setSubscription] = useState(null);

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

  // Get only today's appointments for Julian Vance (current user)
  const myAppts = appointments.filter(a => a.doctor_id === currentUser.id);

  // Map patients to appointments for displaying
  const upcomingPatients = myAppts.map(appt => {
    const patientObj = patients.find(p => p.id === appt.patient_id);
    return {
      ...appt,
      patientName: patientObj ? patientObj.name : 'Unknown Patient',
      initials: patientObj ? patientObj.name.split(' ').map(n => n[0]).join('') : 'UN'
    };
  });

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

        {/* Left Column: Upcoming Patients */}
        <div className="col-span-12 md:col-span-7 space-y-gutter">
          <div className="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div className="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                {isArabic ? 'المرضى القادمون اليوم' : 'Upcoming Patients'}
              </h2>
              <button 
                onClick={() => setActivePage('patients')}
                className="text-primary hover:text-primary-hover font-button text-sm transition-colors font-bold"
              >
                {isArabic ? 'عرض الكل' : 'View All'}
              </button>
            </div>
            <div className="space-y-4">
              {upcomingPatients.length === 0 ? (
                <p className="text-secondary text-sm py-4 text-center">
                  {t('no_appointments')}
                </p>
              ) : (
                upcomingPatients.map((patient, idx) => (
                  <div 
                    key={patient.id} 
                    onClick={() => setActivePage('visits')}
                    className="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-border-subtle group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-button text-sm font-bold ${
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
                          {patient.appointment_time} • {patient.description} • Room {idx + 1}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {patient.is_high_priority && (
                        <span className="px-3 py-1 bg-error-container text-error font-label-caps text-[10px] rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">priority_high</span> 
                          {isArabic ? 'أولوية عالية' : 'High Priority'}
                        </span>
                      )}
                      <span className={`px-3 py-1 font-label-caps text-[10px] rounded-full flex items-center gap-1 ${
                        patient.status === 'confirmed' 
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          : 'bg-surface-container-high text-secondary'
                      }`}>
                        {patient.status.toUpperCase()}
                      </span>
                      <button className="p-2 text-secondary group-hover:text-primary transition-colors">
                        <span className={`material-symbols-outlined ${isArabic ? 'rotate-180' : ''}`}>chevron_right</span>
                      </button>
                    </div>
                  </div>
                ))
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
            </div>
            <div className={`relative border-l ${isArabic ? 'border-r border-l-0 mr-3 ml-0' : 'border-l ml-3 mr-0'} border-border-subtle space-y-6`}>
              <div className={`relative ${isArabic ? 'pr-6 pl-0' : 'pl-6 pr-0'}`}>
                <div className={`absolute w-3 h-3 bg-primary rounded-full ${isArabic ? '-right-[6.5px]' : '-left-[6.5px]'} top-1 ring-4 ring-bg-card`}></div>
                <p className="font-body-sm text-xs text-on-surface">
                  <span className="font-semibold">{currentUser.name}</span> {isArabic ? 'وقع تقرير المريض #8821' : 'signed Patient Report #8821'}
                </p>
                <p className="font-label-caps text-[10px] text-on-surface-variant mt-1">10 mins ago</p>
              </div>
              <div className={`relative ${isArabic ? 'pr-6 pl-0' : 'pl-6 pr-0'}`}>
                <div className={`absolute w-3 h-3 bg-surface-container-high border-2 border-border-subtle rounded-full ${isArabic ? '-right-[6.5px]' : '-left-[6.5px]'} top-1 ring-4 ring-bg-card`}></div>
                <p className="font-body-sm text-xs text-on-surface">
                  <span className="font-semibold">System</span> {isArabic ? 'أنتج ملخص الزيارة الطبية لـ إلينور.' : 'generated clinical notes for Eleanor Sullivan.'}
                </p>
                <p className="font-label-caps text-[10px] text-on-surface-variant mt-1">45 mins ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
