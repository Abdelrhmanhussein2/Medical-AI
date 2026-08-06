import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';

export default function ForceChangePassword({ setActivePage }) {
  const { currentUser, setCurrentUser, apiFetch } = useApp();
  const { isArabic } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError(isArabic 
        ? 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل.' 
        : 'New password must be at least 6 characters.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(isArabic 
        ? 'كلمتا المرور الجديدتان غير متطابقتين.' 
        : 'New passwords do not match.');
      return;
    }
    
    if (currentPassword === newPassword) {
      setError(isArabic 
        ? 'يجب ألا تكون كلمة المرور الجديدة مطابقة للقديمة المؤقتة.' 
        : 'New password cannot be the same as the temporary password.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/doctors/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      
      // Update session storage and app state
      const updatedUser = { ...currentUser, must_change_password: false };
      setCurrentUser(updatedUser);
      sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
      
      setSuccess(true);
      setTimeout(() => {
        setActivePage('dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || (isArabic ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-bg-canvas font-body-md relative ${isArabic ? 'rtl' : 'ltr'}`}>
      <div className={`min-h-screen flex animate-fade-in ${isArabic ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-tr from-primary-light via-white to-primary/10 items-center justify-center p-16 relative overflow-hidden border-r border-border-subtle">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-tertiary-fixed-dim/5 rounded-full blur-3xl"></div>
          
          <div className={`max-w-md space-y-8 relative z-10 ${isArabic ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-3">
              <SbrLogo size={56} color="#24564C" showText={true} textClass="text-primary" />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white border border-border-subtle rounded-full text-xs font-semibold text-primary shadow-sm">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              {isArabic ? 'تأمين الحساب الإجباري' : 'Mandatory Account Security'}
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-primary font-headline-lg leading-tight">
                {isArabic
                  ? 'خطوة واحدة تفصلك عن تأمين حسابك بالكامل'
                  : 'One step away from fully securing your account'}
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                {isArabic
                  ? 'يرجى تغيير كلمة المرور المؤقتة التي استلمتها على البريد الإلكتروني للحفاظ على سرية السجلات وبيانات المراجعين الخاصة بك.'
                  : 'Please update the temporary password you received via email to protect patient confidentiality and secure your workflow.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-24 bg-white relative">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="mb-4 lg:hidden">
                <SbrLogo size={44} color="#24564C" showText={true} textClass="text-primary" />
              </div>
              <h2 className="font-display-lg text-headline-lg text-primary font-bold">
                {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
              </h2>
              <p className="mt-2 text-sm text-secondary text-center">
                {isArabic
                  ? 'يرجى تعيين كلمة مرور جديدة قوية ومحمية.'
                  : 'Please set a new strong and secure password.'}
              </p>
            </div>

            <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
              {success ? (
                <div className="text-center py-6 space-y-3">
                  <span className="material-symbols-outlined text-[48px] text-success animate-bounce">check_circle</span>
                  <p className="text-sm font-bold text-primary">
                    {isArabic 
                      ? 'تم تحديث كلمة المرور بنجاح! جاري التوجيه...' 
                      : 'Password updated successfully! Redirecting...'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (() => {
                    const parts = error.split(' / ');
                    const displayError = parts.length > 1
                      ? (isArabic ? parts[0] : parts[1])
                      : error;
                    return (
                      <div className="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2 text-start" dir={isArabic ? 'rtl' : 'ltr'}>
                        <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                        <span className="leading-relaxed font-semibold">{displayError}</span>
                      </div>
                    );
                  })()}

                  {/* Temporary Password */}
                  <div>
                    <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                      {isArabic ? 'كلمة المرور المؤقتة (الحالية) *' : 'Temporary Password (Current) *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className={`absolute ${isArabic ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary p-0.5`}
                      >
                        <span className="material-symbols-outlined text-[18px] block">
                          {showCurrent ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                      {isArabic ? 'كلمة المرور الجديدة *' : 'New Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className={`absolute ${isArabic ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary p-0.5`}
                      >
                        <span className="material-symbols-outlined text-[18px] block">
                          {showNew ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className={`block text-xs font-semibold text-on-surface-variant mb-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                      {isArabic ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className={`absolute ${isArabic ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary p-0.5`}
                      >
                        <span className="material-symbols-outlined text-[18px] block">
                          {showConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-sm disabled:opacity-70 cursor-pointer"
                  >
                    {loading && <span className="animate-spin material-symbols-outlined text-sm">refresh</span>}
                    {isArabic ? 'تحديث وتأمين الحساب' : 'Update & Secure Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
