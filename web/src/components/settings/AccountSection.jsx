import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AccountSection() {
  const { currentUser, setCurrentUser, updateProfile, apiFetch } = useApp();
  const { t, isArabic } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [specialization, setSpecialization] = useState(currentUser?.specialization || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Email Change Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState(1); // 1 = request, 2 = verify
  const [emailTimer, setEmailTimer] = useState(300);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password Change Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [passwordStep, setPasswordStep] = useState(1); // 1 = request, 2 = verify
  const [passwordTimer, setPasswordTimer] = useState(300);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Password toggle visibility states
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setSpecialization(currentUser.specialization || '');
    }
  }, [currentUser]);

  // Email Timer Countdown
  useEffect(() => {
    let interval = null;
    if (showEmailModal && emailStep === 2 && emailTimer > 0) {
      interval = setInterval(() => {
        setEmailTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showEmailModal, emailStep, emailTimer]);

  // Password Timer Countdown
  useEffect(() => {
    let interval = null;
    if (showPasswordModal && passwordStep === 2 && passwordTimer > 0) {
      interval = setInterval(() => {
        setPasswordTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showPasswordModal, passwordStep, passwordTimer]);

  // Format timer helper
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await updateProfile(name, currentUser.email, specialization);
      setMessage(t('update_success'));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || t('update_error'));
    } finally {
      setLoading(false);
    }
  };

  // OTP Email Request Handler
  const handleRequestEmailOtp = async (e) => {
    e.preventDefault();
    if (!newEmail) return;
    
    if (newEmail === currentUser.email) {
      setEmailError(isArabic ? 'البريد الجديد مطابق للبريد الحالي.' : 'New email matches current email.');
      return;
    }

    setEmailLoading(true);
    setEmailError('');
    try {
      await apiFetch('/doctors/me/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'change_email',
          new_email: newEmail
        })
      });
      setEmailStep(2);
      setEmailTimer(300);
    } catch (err) {
      setEmailError(err.message || (isArabic ? 'فشل إرسال رمز التحقق.' : 'Failed to send verification code.'));
    } finally {
      setEmailLoading(false);
    }
  };

  // OTP Email Verification Handler
  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    if (!emailOtp) return;

    setEmailLoading(true);
    setEmailError('');
    try {
      const response = await apiFetch('/doctors/me/verify-otp-change-email', {
        method: 'POST',
        body: JSON.stringify({
          otp: emailOtp,
          new_email: newEmail
        })
      });
      
      // Update locally
      const updatedUser = { ...currentUser, email: newEmail };
      setCurrentUser(updatedUser);
      sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setEmailSuccess(isArabic ? 'تم تغيير البريد الإلكتروني بنجاح!' : 'Email updated successfully!');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccess('');
      }, 1500);
    } catch (err) {
      setEmailError(err.message || (isArabic ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.'));
    } finally {
      setEmailLoading(false);
    }
  };

  // OTP Password Request Handler
  const handleRequestPasswordOtp = async (e) => {
    e.preventDefault();

    setPasswordLoading(true);
    setPasswordError('');
    try {
      await apiFetch('/doctors/me/request-otp', {
        method: 'POST',
        body: JSON.stringify({
          action: 'change_password'
        })
      });
      setPasswordStep(2);
      setPasswordTimer(300);
    } catch (err) {
      setPasswordError(err.message || (isArabic ? 'فشل إرسال رمز التحقق.' : 'Failed to send verification code.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // OTP Password Verification Handler
  const handleVerifyPasswordOtp = async (e) => {
    e.preventDefault();
    if (!passwordOtp || !newPassword || !confirmNewPassword) return;

    if (newPassword.length < 6) {
      setPasswordError(isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(isArabic ? 'كلمتا المرور الجديدتان غير متطابقتين.' : 'New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      await apiFetch('/doctors/me/verify-otp-change-password', {
        method: 'POST',
        body: JSON.stringify({
          otp: passwordOtp,
          new_password: newPassword
        })
      });

      setPasswordSuccess(isArabic ? 'تم تغيير كلمة المرور بنجاح!' : 'Password updated successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || (isArabic ? 'رمز التحقق غير صحيح أو منتهي الصلاحية.' : 'Invalid or expired verification code.'));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm animate-fade-in text-start relative">
      <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">person</span>
        {t('account_info')}
      </h2>

      {message && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('full_name')}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas disabled:opacity-75 disabled:cursor-not-allowed text-on-surface"
            disabled={!isEditing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Email Address (Read-only + Secure OTP Change Trigger) */}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('email_address')}
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas text-secondary cursor-not-allowed font-semibold opacity-75"
              disabled
              value={email}
            />
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNewEmail('');
                  setEmailOtp('');
                  setEmailStep(1);
                  setEmailError('');
                  setEmailSuccess('');
                  setShowEmailModal(true);
                }}
                className="px-3.5 py-2 bg-primary-light hover:bg-primary/20 text-primary font-bold text-xs rounded-lg transition-colors border border-primary/20 cursor-pointer whitespace-nowrap"
              >
                {isArabic ? 'تغيير الإيميل' : 'Change Email'}
              </button>
            )}
          </div>
        </div>

        {/* Specialization */}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('specialization')}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas disabled:opacity-75 disabled:cursor-not-allowed text-on-surface"
            disabled={!isEditing}
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg border border-border-subtle transition-colors cursor-pointer"
                onClick={() => {
                  setName(currentUser?.name || '');
                  setEmail(currentUser?.email || '');
                  setSpecialization(currentUser?.specialization || '');
                  setIsEditing(false);
                  setError('');
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading && <span className="animate-spin material-symbols-outlined text-xs">refresh</span>}
                {t('save_changes')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm cursor-pointer"
              onClick={() => setIsEditing(true)}
            >
              {t('edit')}
            </button>
          )}
        </div>
      </form>

      {/* Change Password Security Section */}
      <div className="mt-8 pt-6 border-t border-border-subtle">
        <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">security</span>
          {isArabic ? 'الأمان وتغيير كلمة المرور' : 'Security & Password Update'}
        </h3>
        <p className="text-xs text-secondary mb-4 leading-relaxed">
          {isArabic 
            ? 'يمكنك تغيير كلمة المرور الخاصة بك في أي وقت. لأسباب أمنية، سنرسل رمز التحقق (OTP) إلى بريدك الإلكتروني الحالي لتأكيد هويتك.' 
            : 'You can change your password at any time. For security reasons, a verification code (OTP) will be sent to your registered email to verify your identity.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setPasswordOtp('');
            setNewPassword('');
            setConfirmNewPassword('');
            setPasswordStep(1);
            setPasswordError('');
            setPasswordSuccess('');
            setShowPasswordModal(true);
          }}
          className="px-4 py-2 bg-white border border-border-subtle hover:bg-surface-container text-secondary hover:text-primary font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
        >
          {isArabic ? 'طلب تغيير كلمة المرور' : 'Change Password'}
        </button>
      </div>

      {/* ──────────────── EMAIL OTP MODAL ──────────────── */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden animate-fade-in">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className="font-bold text-sm text-primary">
                {isArabic ? 'تغيير البريد الإلكتروني' : 'Change Email Address'}
              </h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6">
              {emailSuccess ? (
                <div className="text-center py-4 space-y-2">
                  <span className="material-symbols-outlined text-[48px] text-success animate-bounce">check_circle</span>
                  <p className="text-xs font-bold text-primary">{emailSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {emailError && (
                    <div className="bg-error-container text-error text-[11px] p-2.5 rounded-lg flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{emailError}</span>
                    </div>
                  )}

                  {emailStep === 1 ? (
                    <form onSubmit={handleRequestEmailOtp} className="space-y-4">
                      <p className="text-xs text-secondary leading-relaxed">
                        {isArabic 
                          ? 'أدخل بريدك الإلكتروني الجديد. سنرسل رمز التحقق (OTP) إلى بريدك الحالي لتأكيد الهوية.' 
                          : 'Enter your new email address. We will send a verification code (OTP) to your current email to authorize this change.'}
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          {isArabic ? 'البريد الإلكتروني الجديد *' : 'New Email Address *'}
                        </label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="doctor@newdomain.com"
                          className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={emailLoading}
                        className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-70 cursor-pointer"
                      >
                        {emailLoading && <span className="animate-spin material-symbols-outlined text-xs mr-1">refresh</span>}
                        {isArabic ? 'إرسال رمز التحقق' : 'Send Verification Code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                      <p className="text-xs text-secondary leading-relaxed">
                        {isArabic 
                          ? `تم إرسال الرمز إلى ${currentUser?.email}. الرمز صالح لمدة 5 دقائق.` 
                          : `Code sent to ${currentUser?.email}. Valid for 5 minutes.`}
                      </p>
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          {isArabic ? 'رمز التحقق (OTP) *' : 'Verification Code (OTP) *'}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength="6"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value)}
                          placeholder="123456"
                          className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-secondary">
                        <span>{isArabic ? 'صلاحية الرمز:' : 'Expires in:'} <strong className="text-primary font-bold">{formatTime(emailTimer)}</strong></span>
                        {emailTimer === 0 && (
                          <button
                            type="button"
                            onClick={handleRequestEmailOtp}
                            className="text-primary hover:underline font-bold"
                          >
                            {isArabic ? 'إعادة الإرسال' : 'Resend Code'}
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={emailLoading || !emailOtp}
                        className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-70 cursor-pointer"
                      >
                        {emailLoading && <span className="animate-spin material-symbols-outlined text-xs mr-1">refresh</span>}
                        {isArabic ? 'تأكيد وتغيير البريد الإلكتروني' : 'Verify & Change Email'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PASSWORD OTP MODAL ──────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-border-subtle shadow-lg max-w-sm w-full overflow-hidden animate-fade-in">
            <div className={`px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas ${isArabic ? 'flex-row-reverse' : ''}`}>
              <h3 className="font-bold text-sm text-primary">
                {isArabic ? 'تغيير كلمة المرور' : 'Change Password'}
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6">
              {passwordSuccess ? (
                <div className="text-center py-4 space-y-2">
                  <span className="material-symbols-outlined text-[48px] text-success animate-bounce">check_circle</span>
                  <p className="text-xs font-bold text-primary">{passwordSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-error-container text-error text-[11px] p-2.5 rounded-lg flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordStep === 1 ? (
                    <form onSubmit={handleRequestPasswordOtp} className="space-y-4">
                      <p className="text-xs text-secondary leading-relaxed">
                        {isArabic 
                          ? `سنرسل رمز تحقق (OTP) إلى بريدك الإلكتروني المعتمد (${currentUser?.email}) لتأكيد ملكية الحساب قبل التغيير.` 
                          : `We will send a verification code (OTP) to your registered email (${currentUser?.email}) to confirm ownership before changing your password.`}
                      </p>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2.5 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-70 cursor-pointer"
                      >
                        {passwordLoading && <span className="animate-spin material-symbols-outlined text-xs mr-1">refresh</span>}
                        {isArabic ? 'إرسال رمز التحقق بالبريد' : 'Send OTP to Email'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyPasswordOtp} className="space-y-4">
                      <p className="text-xs text-secondary leading-relaxed">
                        {isArabic 
                          ? `أدخل رمز التحقق المرسل إلى ${currentUser?.email} مع كلمة المرور الجديدة.` 
                          : `Enter the code sent to ${currentUser?.email} and set your new password.`}
                      </p>

                      {/* Verification OTP */}
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          {isArabic ? 'رمز التحقق (OTP) *' : 'Verification Code (OTP) *'}
                        </label>
                        <input
                          type="text"
                          required
                          maxLength="6"
                          value={passwordOtp}
                          onChange={(e) => setPasswordOtp(e.target.value)}
                          placeholder="123456"
                          className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          {isArabic ? 'كلمة المرور الجديدة *' : 'New Password *'}
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary p-0.5"
                          >
                            <span className="material-symbols-outlined text-[16px] block">
                              {showNewPass ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-[11px] font-semibold text-secondary mb-1">
                          {isArabic ? 'تأكيد كلمة المرور الجديدة *' : 'Confirm New Password *'}
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary p-0.5"
                          >
                            <span className="material-symbols-outlined text-[16px] block">
                              {showConfirmPass ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-secondary">
                        <span>{isArabic ? 'صلاحية الرمز:' : 'Expires in:'} <strong className="text-primary font-bold">{formatTime(passwordTimer)}</strong></span>
                        {passwordTimer === 0 && (
                          <button
                            type="button"
                            onClick={handleRequestPasswordOtp}
                            className="text-primary hover:underline font-bold"
                          >
                            {isArabic ? 'إعادة الإرسال' : 'Resend Code'}
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={passwordLoading || !passwordOtp || !newPassword || !confirmNewPassword}
                        className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-70 cursor-pointer"
                      >
                        {passwordLoading && <span className="animate-spin material-symbols-outlined text-xs mr-1">refresh</span>}
                        {isArabic ? 'تأكيد وتغيير كلمة المرور' : 'Verify & Change Password'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
