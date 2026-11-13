import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import SbrLogo from '../components/SbrLogo';

export default function Unauthorized() {
  const { isArabic } = useLanguage();
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (!currentUser) {
      navigate('/login');
    } else if (currentUser.role === 'admin') {
      navigate('/admin-overview');
    } else if (currentUser.role === 'org' || currentUser.role === 'department') {
      navigate('/org-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen bg-bg-canvas flex flex-col justify-between font-body-md">
      {/* Top Bar */}
      <header className="p-6 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <SbrLogo size={40} color="#006973" showText={true} textClass="text-primary font-bold" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-border-subtle rounded-2xl p-8 shadow-sm text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-error-container/20 border border-error/30 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-4xl">gpp_bad</span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold tracking-widest text-error uppercase bg-error/10 px-3 py-1 rounded-full inline-block">
              HTTP 403 — FORBIDDEN
            </span>
            <h1 className="text-2xl font-bold text-on-surface">
              {isArabic ? 'غير مصرح لك بالوصول' : 'Access Denied'}
            </h1>
            <p className="text-sm text-secondary leading-relaxed">
              {isArabic
                ? 'ليس لديك الصلاحيات الكافية لعرض هذه الصفحة أو المورد المطلوب. هذه المنطقة مخصصة فقط للمستخدمين المصرح لهم.'
                : "You don't have permission to view this page or resource. This area is strictly restricted to authorized roles."}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isArabic ? 'arrow_forward' : 'arrow_back'}
              </span>
              <span>
                {currentUser 
                  ? (isArabic ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard')
                  : (isArabic ? 'تسجيل الدخول' : 'Go to Login')}
              </span>
            </button>

            {currentUser && (
              <button
                onClick={logout}
                className="w-full sm:w-auto px-6 py-2.5 border border-border-subtle hover:bg-surface-container-low text-secondary font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>{isArabic ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-secondary border-t border-border-subtle">
        <p>© 2026 SBR AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

