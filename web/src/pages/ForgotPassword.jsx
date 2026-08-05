import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from '../components/SbrLogo';

export default function ForgotPassword({ setActivePage }) {
  const { apiFetch } = useApp();
  const { lang, setLang, isArabic } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds

  // Countdown timer for OTP
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStep(2);
      setTimer(300); // Reset timer to 5 minutes
      setSuccess(
        isArabic
          ? 'تم إرسال رمز التحقق (OTP) إلى بريدك الإلكتروني بنجاح.'
          : 'Verification code (OTP) sent to your email successfully.'
      );
    } catch (err) {
      setError(err.message || (isArabic ? 'حدث خطأ أثناء إرسال الرمز.' : 'Failed to send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) {
      setError(isArabic ? 'الرجاء إدخال رمز التحقق كاملاً.' : 'Please enter a valid OTP code.');
      return;
    }
    if (timer === 0) {
      setError(isArabic ? 'انتهت صلاحية رمز التحقق. يرجى طلبه مجدداً.' : 'OTP expired. Please request a new one.');
      return;
    }
    // Proceed to set new password step (validation happens at the backend on final reset)
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError(isArabic ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError(isArabic ? 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' : 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      setSuccess(
        isArabic
          ? 'تم تعيين كلمة المرور الجديدة بنجاح. سيتم توجيهك لصفحة تسجيل الدخول...'
          : 'Password reset successfully. Redirecting to login...'
      );
      setTimeout(() => {
        setActivePage('login');
      }, 3000);
    } catch (err) {
      setError(err.message || (isArabic ? 'فشل إعادة تعيين كلمة المرور.' : 'Password reset failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-bg-canvas font-body-md relative flex items-center justify-center p-6 ${isArabic ? 'rtl' : 'ltr'}`}>
      {/* Floating Language Switcher */}
      <div className={`absolute top-6 ${isArabic ? 'left-6' : 'right-6'} z-10`}>
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle bg-white text-secondary hover:text-primary rounded-lg text-xs font-bold shadow-sm transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">language</span>
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <SbrLogo size={48} color="#24564C" showText={true} textClass="text-primary" />
          </div>
          <h2 className="font-display-lg text-2xl md:text-3xl text-primary font-bold">
            {isArabic ? 'استعادة كلمة المرور' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-sm text-secondary">
            {isArabic
              ? 'اتبع الخطوات البسيطة لاسترداد حسابك الطبي بأمان.'
              : 'Follow the steps to securely recover your clinical account.'}
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-8 shadow-sm">
          {error && (
            <div className="mb-4 bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-primary-light/30 text-primary text-xs p-3 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary-light text-on-primary font-button py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-base"
              >
                {loading ? (isArabic ? 'جاري الإرسال...' : 'Sending...') : (isArabic ? 'أرسل رمز التحقق' : 'Send Code')}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-center py-2 bg-surface-container-low rounded-lg mb-4">
                <span className="text-xs text-secondary block">{isArabic ? 'متبقي على انتهاء الصلاحية' : 'Code expires in'}</span>
                <span className={`text-xl font-bold ${timer < 60 ? 'text-error animate-pulse' : 'text-primary'}`}>{formatTime(timer)}</span>
              </div>

              <div>
                <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'رمز التحقق (OTP)' : 'Verification Code (OTP)'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div className="flex justify-between items-center text-xs mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-secondary hover:text-primary font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  {isArabic ? 'تعديل الإيميل' : 'Edit Email'}
                </button>
                
                {timer === 0 && (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-primary hover:underline font-semibold"
                  >
                    {isArabic ? 'إعادة إرسال الرمز' : 'Resend Code'}
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-on-primary font-button py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-base"
              >
                {isArabic ? 'تحقق ومتابعة' : 'Verify and Proceed'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold text-on-surface-variant mb-1.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary text-on-surface ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary-light text-on-primary font-button py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-semibold mt-6 text-base"
              >
                {loading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ كلمة المرور' : 'Reset Password')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-border-subtle pt-6">
            <button
              onClick={() => setActivePage('login')}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {isArabic ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
