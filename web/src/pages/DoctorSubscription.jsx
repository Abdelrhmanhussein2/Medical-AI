import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { PLANS } from '../data/plans';

export default function DoctorSubscription() {
  const navigate = useNavigate();
  const { renewSubscription } = useApp();
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
    const matchedPlan = PLANS.find(p => 
      p.id === planNameLower || 
      p.nameEn.toLowerCase() === planNameLower || 
      (subscription.bundle_name_ar && p.nameAr === subscription.bundle_name_ar)
    ) || PLANS[1];
    
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
      <div className="mb-8">
        <h1 className="text-2xl font-headline-lg font-bold text-primary mb-2">
          {t('my_subscription')}
        </h1>
        <p className="text-secondary text-sm">
          {isArabic ? 'إدارة باقة اشتراك الذكاء الاصطناعي الخاصة بعيادتك.' : "Manage your clinic's AI subscription plan."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container text-error rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      {!subscription ? (
        <div className="bg-white rounded-2xl border border-border-subtle p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">card_membership</span>
          <h3 className="text-lg font-bold text-on-surface mb-2">{t('no_subscription')}</h3>
          <p className="text-secondary text-sm mb-6">
            {isArabic ? 'ليس لديك اشتراك نشط حالياً.' : 'You currently do not have an active subscription plan.'}
          </p>
        </div>
      ) : (() => {
        // Find matching plan from PLANS configuration
        const planNameLower = (subscription.bundle_name || '').toLowerCase();
        const matchedPlan = PLANS.find(p => 
          p.id === planNameLower || 
          p.nameEn.toLowerCase() === planNameLower || 
          (subscription.bundle_name_ar && p.nameAr === subscription.bundle_name_ar)
        ) || PLANS[1]; // Fallback to Starter if not found

        const planName = isArabic 
          ? (subscription.bundle_name_ar || matchedPlan.nameAr) 
          : (subscription.bundle_name || matchedPlan.nameEn);
          
        const totalMinutes = matchedPlan.minutes || 1000;
        const usedMinutes = subscription.used_minutes || 0;
        const percentMinutes = Math.min(Math.round((usedMinutes / totalMinutes) * 100), 100);

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
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden shadow-sm animate-fade-in mt-6">
              <div className="p-6 border-b border-border-subtle">
                <h2 className="text-lg font-bold text-on-surface">{t('usage_stats')}</h2>
                <p className="text-secondary text-sm mt-1">
                  {isArabic ? 'حدود الذكاء الاصطناعي المتاحة لدورة الفوترة الحالية.' : 'Your AI limits for the current billing cycle.'}
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">
                          {isArabic ? 'دقائق الذكاء الاصطناعي المستخدمة' : 'AI Minutes Used'}
                        </h3>
                        <p className="text-xs text-secondary">
                          {isArabic 
                            ? `${usedMinutes} دقيقة مستخدمة من أصل ${totalMinutes}` 
                            : `${usedMinutes} minutes used out of ${totalMinutes}`}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-primary">{percentMinutes}%</span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentMinutes}%` }}></div>
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
