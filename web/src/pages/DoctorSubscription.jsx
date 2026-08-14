import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export default function DoctorSubscription() {
  const navigate = useNavigate();
  const { renewSubscription, mergedPlans } = useApp();
  const { t, isArabic } = useLanguage();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = sessionStorage.getItem("accessToken");
        const response = await fetch(`/api/v1/subscriptions/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          if (response.status !== 404) {
            throw new Error('Failed to fetch subscription');
          } else {
            setSubscription(null);
          }
        } else {
          if (response.status !== 204) {
             const data = await response.json();
             setSubscription(data || null);
          } else {
             setSubscription(null);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, []);

  const handleRenew = () => {
    if (!subscription) return;
    const planNameLower = (subscription.bundle_name || '').toLowerCase();
    const matchedPlan = mergedPlans.find(p => 
      p.id === planNameLower || 
      p.nameEn.toLowerCase() === planNameLower || 
      (subscription.bundle_name_ar && p.nameAr === subscription.bundle_name_ar)
    ) || mergedPlans[1];
    
    navigate(`/checkout?plan=${matchedPlan.id}`);
  };


  if (loading) {
    return (
      <div class="p-8 flex items-center justify-center min-h-[400px]">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 text-start">
      <div className="mb-8 border-b border-border-subtle pb-4">
        <h1 className="text-2xl font-headline-lg font-bold text-on-surface">
          {t('my_subscription')}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container text-error rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {!subscription ? (
        <div className="bg-white rounded-2xl border border-border-subtle p-8 text-center shadow-sm flex flex-col items-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">card_membership</span>
          <h3 className="text-lg font-bold text-on-surface mb-2">{t('no_subscription')}</h3>
          <p className="text-secondary text-sm mb-6">
            {isArabic ? 'ليس لديك اشتراك نشط حالياً.' : 'You currently do not have an active subscription plan.'}
          </p>
          <button
            onClick={() => navigate('/checkout?plan=starter')}
            className="bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            {isArabic ? 'اختر خطة لتفعيل الاشتراك' : 'Select a Plan to Activate Subscription'}
          </button>
        </div>
      ) : (() => {
        // Find matching plan from PLANS configuration
        const planNameLower = (subscription.bundle_name || '').toLowerCase();
        const matchedPlan = mergedPlans.find(p => 
          p.id === planNameLower || 
          p.nameEn.toLowerCase() === planNameLower || 
          (subscription.bundle_name_ar && p.nameAr === subscription.bundle_name_ar)
        ) || mergedPlans[1]; // Fallback to Starter if not found

        const planName = isArabic 
          ? (subscription.bundle_name_ar || matchedPlan.nameAr) 
          : (subscription.bundle_name || matchedPlan.nameEn);
          
        // Use allowed_minutes from API (server-side calculated from actual bundle)
        const totalMinutes = subscription.allowed_minutes || matchedPlan.minutes || 1000;
        const usedMinutes = subscription.used_minutes || 0;
        const remainingMinutes = Math.max(totalMinutes - usedMinutes, 0);
        const percentMinutes = Math.min(Math.round((usedMinutes / totalMinutes) * 100), 100);

        // Approximate message limit from plan (same formula used by the DB function)
        // voice_cost_per_minute=0.007, avg_tokens=6000, input_ratio=0.70, output_ratio=0.30
        // llm_input=$0.15/M, llm_output=$0.60/M  → cost_per_msg ≈ $0.001710
        // We map plan minutes to a rough message budget: starter=1000min→$1.71 budget
        // For simplicity we use a flat approximation based on plan tier
        const messageLimitByPlan = {
          free:       100,
          starter:   1169,
          pro:       2339,
          business:  4678,
          enterprise: 8187,
        };
        const totalMessages = subscription.allowed_messages || matchedPlan.messagesApprox || messageLimitByPlan[matchedPlan.id] || 2631;
        const usedMessages = subscription.used_messages || 0;
        const remainingMessages = Math.max(totalMessages - usedMessages, 0);
        const percentMessages = Math.min(Math.round((usedMessages / totalMessages) * 100), 100);

        return (
          <>
            <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden shadow-sm animate-fade-in">
              <div className="bg-gradient-to-r from-primary-light/10 to-white p-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary bg-white p-1.5 rounded-lg shadow-sm">
                      workspace_premium
                    </span>
                    <h2 className="text-xl font-bold text-primary">{planName}</h2>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                      subscription.status === 'active' ? 'bg-success/10 text-success' : 'bg-error-container text-error'
                    }`}>
                      {subscription.status === 'active' ? t('active') : t('expired')}
                    </span>
                  </div>
                  <p className="text-secondary text-sm mt-1">
                    {isArabic ? 'إمكانية استخدام أدوات وملاحظات الذكاء الاصطناعي المميزة.' : 'Access to premium AI clinical notes and tools.'}
                  </p>
                </div>
                
                {subscription.managed_by_org && (
                  <div className="bg-white px-3 py-2 rounded-lg border border-border-subtle flex items-center gap-2 shadow-sm self-start">
                    <span className="material-symbols-outlined text-[16px] text-primary">corporate_fare</span>
                    <span className="text-xs font-bold text-on-surface">
                      {isArabic ? 'مدار بواسطة المنظمة' : 'Managed by Organization'}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline-variant text-[24px]">calendar_today</span>
                    <div>
                      <p className="text-xs text-secondary mb-0.5">{isArabic ? 'تاريخ البدء' : 'Start Date'}</p>
                      <p className="font-bold text-on-surface">{new Date(subscription.start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline-variant text-[24px]">event_available</span>
                    <div>
                      <p className="text-xs text-secondary mb-0.5">{t('renewal_date')}</p>
                      <p className="font-bold text-on-surface">{new Date(subscription.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {!subscription.managed_by_org && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-primary/5 rounded-xl border border-primary/20 gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-primary mb-1">{t('renew_now')}</h3>
                      <p className="text-xs text-secondary">
                        {isArabic 
                          ? 'قم بتمديد اشتراكك قبل تاريخ الانتهاء لضمان استمرار الخدمة دون انقطاع.' 
                          : 'Extend your subscription before it expires to maintain uninterrupted access.'}
                      </p>
                    </div>
                    <button
                      onClick={handleRenew}
                      disabled={renewing}
                      className="w-full sm:w-auto bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {renewing ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">autorenew</span>
                      )}
                      {t('renew_now')}
                    </button>
                  </div>
                )}

                {/* Rollover Balance Card */}
                {((subscription.rolled_over_minutes > 0) || (subscription.rolled_over_messages > 0)) && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">savings</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-800 mb-1">
                        {isArabic ? 'رصيد محوّل من الباقة السابقة' : 'Balance Carried Over from Previous Plan'}
                      </h4>
                      <p className="text-xs text-amber-700 mb-3">
                        {isArabic
                          ? 'الرصيد المتبقي من اشتراكك السابق تم إضافته تلقائياً إلى باقتك الجديدة.'
                          : 'Your unused balance from the previous subscription was automatically added to your new plan.'}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {subscription.rolled_over_minutes > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-amber-200 text-center">
                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">
                              {isArabic ? 'دقائق محوّلة' : 'Carried Minutes'}
                            </p>
                            <p className="text-lg font-black text-amber-700">
                              +{subscription.rolled_over_minutes.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-amber-500 mt-0.5">
                              {isArabic ? 'دقيقة ترحّلت' : 'min rolled over'}
                            </p>
                          </div>
                        )}
                        {subscription.rolled_over_messages > 0 && (
                          <div className="bg-white rounded-lg p-3 border border-amber-200 text-center">
                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">
                              {isArabic ? 'رسائل محوّلة' : 'Carried Messages'}
                            </p>
                            <p className="text-lg font-black text-amber-700">
                              +{subscription.rolled_over_messages.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-amber-500 mt-0.5">
                              {isArabic ? 'رسالة ترحّلت' : 'msgs rolled over'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden shadow-sm animate-fade-in mt-6">
              <div className="p-6 border-b border-border-subtle">
                <h2 className="text-lg font-bold text-on-surface">{t('usage_stats')}</h2>
                <p className="text-secondary text-sm mt-1">
                  {isArabic ? 'حدود الاستخدام المتاحة لدورة الفوترة الحالية.' : 'Your limits for the current billing cycle.'}
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-8">

                  {/* ── Minutes ── */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">mic</span>
                          {isArabic ? 'دقائق الاستشارة الذكية المستخدمة' : 'Smart Consultation Minutes Used'}
                        </h3>
                        <p className="text-xs text-secondary mt-0.5">
                          {isArabic
                            ? `${usedMinutes.toLocaleString()} دقيقة مستخدمة من أصل ${totalMinutes.toLocaleString()}`
                            : `${usedMinutes.toLocaleString()} of ${totalMinutes.toLocaleString()} minutes used`}
                        </p>
                      </div>
                      <div className="text-end">
                        <span className={`text-sm font-bold ${percentMinutes >= 90 ? 'text-error' : percentMinutes >= 70 ? 'text-warning' : 'text-primary'}`}>
                          {percentMinutes}%
                        </span>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {isArabic
                            ? `${remainingMinutes.toLocaleString()} دقيقة متبقية`
                            : `${remainingMinutes.toLocaleString()} remaining`}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${
                          percentMinutes >= 90 ? 'bg-error' : percentMinutes >= 70 ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${percentMinutes}%` }}
                      />
                    </div>
                    {/* Remaining chip */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        remainingMinutes === 0
                          ? 'bg-error/10 text-error'
                          : 'bg-primary-light text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {remainingMinutes === 0 ? 'warning' : 'timer'}
                        </span>
                        {remainingMinutes === 0
                          ? (isArabic ? 'نفدت الدقائق' : 'Minutes exhausted')
                          : (isArabic
                              ? `${remainingMinutes.toLocaleString()} دقيقة متبقية`
                              : `${remainingMinutes.toLocaleString()} min left`)}
                      </span>
                      {/* Rollover breakdown */}
                      {subscription.rolled_over_minutes > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                          <span className="material-symbols-outlined text-[13px]">savings</span>
                          {isArabic
                            ? `${(totalMinutes - subscription.rolled_over_minutes).toLocaleString()} + ${subscription.rolled_over_minutes.toLocaleString()} محوّلة = ${totalMinutes.toLocaleString()}`
                            : `${(totalMinutes - subscription.rolled_over_minutes).toLocaleString()} new + ${subscription.rolled_over_minutes.toLocaleString()} carried = ${totalMinutes.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Messages ── */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-secondary">chat</span>
                          {isArabic ? 'الرسائل المستخدمة' : 'Messages Used'}
                        </h3>
                        <p className="text-xs text-secondary mt-0.5">
                          {isArabic
                            ? `${usedMessages.toLocaleString()} رسالة مستخدمة من أصل ~${totalMessages.toLocaleString()}`
                            : `${usedMessages.toLocaleString()} of ~${totalMessages.toLocaleString()} messages used`}
                        </p>
                      </div>
                      <div className="text-end">
                        <span className={`text-sm font-bold ${percentMessages >= 90 ? 'text-error' : percentMessages >= 70 ? 'text-warning' : 'text-secondary'}`}>
                          {percentMessages}%
                        </span>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {isArabic
                            ? `~${remainingMessages.toLocaleString()} رسالة متبقية`
                            : `~${remainingMessages.toLocaleString()} remaining`}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${
                          percentMessages >= 90 ? 'bg-error' : percentMessages >= 70 ? 'bg-warning' : 'bg-secondary'
                        }`}
                        style={{ width: `${percentMessages}%` }}
                      />
                    </div>
                    {/* Remaining chip */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                        remainingMessages === 0
                          ? 'bg-error/10 text-error'
                          : 'bg-surface-container text-secondary'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {remainingMessages === 0 ? 'warning' : 'chat_bubble'}
                        </span>
                        {remainingMessages === 0
                          ? (isArabic ? 'نفدت الرسائل' : 'Messages exhausted')
                          : (isArabic
                              ? `~${remainingMessages.toLocaleString()} رسالة متبقية`
                              : `~${remainingMessages.toLocaleString()} msgs left`)}
                      </span>
                      {/* Rollover breakdown */}
                      {subscription.rolled_over_messages > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700">
                          <span className="material-symbols-outlined text-[13px]">savings</span>
                          {isArabic
                            ? `${(totalMessages - subscription.rolled_over_messages).toLocaleString()} + ${subscription.rolled_over_messages.toLocaleString()} محوّلة = ${totalMessages.toLocaleString()}`
                            : `${(totalMessages - subscription.rolled_over_messages).toLocaleString()} new + ${subscription.rolled_over_messages.toLocaleString()} carried = ${totalMessages.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
