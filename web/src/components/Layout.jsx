import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useSession } from '../context/SessionContext';
import { useLanguage } from '../context/LanguageContext';
import SbrLogo from './SbrLogo';
import ConfirmModal from './modals/ConfirmModal';

export default function Layout({ children, activePage, setActivePage }) {
  const { currentUser, logout } = useApp();
  const { isRecording, duration, appointmentId, patient } = useSession();
  const { t, dir, isArabic } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!currentUser) return <>{children}</>;

  const isLiveSession = activePage && activePage.startsWith('live-session');
  if (isLiveSession) return <>{children}</>;

  let suiteSub = "";
  let menuItems = [];

  if (currentUser.role === 'admin') {
    suiteSub = t('admin_suite');
    menuItems = [
      { id: 'admin-overview', name: t('dashboard'), icon: 'grid_view' },
      { id: 'admin-users', name: t('department'), icon: 'corporate_fare' },
      { id: 'admin-subscriptions', name: t('subscription'), icon: 'credit_card' },
      { id: 'aichat', name: t('aichat'), icon: 'smart_toy' }
    ];
  } else if (currentUser.role === 'org') {
    suiteSub = t('org_suite');
    menuItems = [
      { id: 'org-dashboard', name: t('dashboard'), icon: 'dashboard' },
      { id: 'org-doctors', name: t('doctor'), icon: 'medical_information' },
      { id: 'org-analytics', name: isArabic ? 'التحليلات' : 'Analytics', icon: 'analytics' },
      { id: 'org-subscriptions', name: t('subscription'), icon: 'credit_card' }
    ];
  } else {
    menuItems = [
      { id: 'dashboard', name: t('dashboard'), icon: 'dashboard' },
      { id: 'patients', name: t('patients'), icon: 'group' },
      { id: 'appointments', name: t('appointments'), icon: 'calendar_month' },
      { id: 'visits', name: t('visits'), icon: 'medical_information' },
      { id: 'templates', name: isArabic ? 'القوالب الطبية' : 'Note Templates', icon: 'assignment' },
      { id: 'aichat', name: t('aichat'), icon: 'smart_toy' },
      { id: 'subscription', name: t('subscription'), icon: 'card_membership' }
    ];
  }

  // Current page label for mobile header
  const currentPageLabel = (() => {
    const allItems = [...menuItems, { id: 'settings', name: t('settings'), icon: 'settings' }];
    const found = allItems.find(item =>
      activePage === item.id || (item.id === 'aichat' && activePage?.startsWith('aichat-patient-'))
    );
    return found?.name || '';
  })();

  // Adjust sidebar fixed positioning class
  const sideNavPosClass = isArabic ? 'right-0 border-l' : 'left-0 border-r';
  const mainMarginClass = isArabic ? 'md:mr-64 md:ml-0' : 'md:ml-64 md:mr-0';
  const isAiChat = activePage === 'aichat';

  // Mobile side drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bg-canvas text-on-background">
      {/* SideNavBar — Desktop only */}
      <nav className={`hidden md:flex bg-bg-canvas text-primary font-body-sm h-screen w-64 fixed ${sideNavPosClass} top-0 border-border-subtle flex flex-col py-stack-lg z-40`}>
        <div className="px-stack-md mb-stack-lg">
          <div className="px-stack-md block mb-4">
            <SbrLogo size={36} color="#24564C" showText={true} textClass="text-primary" />
            {suiteSub && (
              <span className={`text-[9px] font-black text-secondary tracking-widest block uppercase mt-1.5 ${isArabic ? 'mr-1' : 'ml-1'}`}>{suiteSub}</span>
            )}
          </div>

          <div className="flex items-center gap-stack-sm px-stack-md mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold border border-border-subtle shadow-sm uppercase">
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
            </div>
            <div>
              <p className="font-button text-button text-on-surface text-base font-bold truncate max-w-[140px]">{currentUser.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-sm truncate max-w-[140px]">
                {currentUser.role === 'admin'
                  ? t('super_admin')
                  : currentUser.role === 'org'
                    ? (currentUser.specialty || t('department'))
                    : (currentUser.department || t('doctor'))
                }
              </p>
            </div>
          </div>
        </div>

        <ul className="px-stack-sm space-y-1">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer rounded-lg transition-colors text-start ${
                  activePage === item.id || (item.id === 'aichat' && activePage.startsWith('aichat-patient-'))
                    ? 'bg-primary-light text-primary font-bold shadow-sm'
                    : 'text-secondary hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm font-semibold">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Active Session Indicator Widget */}
        {isRecording && appointmentId && (
          <div className="mx-4 my-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-start animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{t('active_recording')}</span>
            </div>
            {patient && (
              <p className="text-xs font-bold text-on-surface truncate max-w-[190px]">{patient.name}</p>
            )}
            <button
              onClick={() => setActivePage(`live-session-${appointmentId}`)}
              className="w-full py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-lg text-center transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[12px]">keyboard_return</span>
              {t('return_to_session')}
            </button>
          </div>
        )}

        <ul className="px-stack-sm mt-auto space-y-1">
          <li>
            <button
              onClick={() => setActivePage('settings')}
              className={`w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer rounded-lg transition-colors text-start ${
                activePage === 'settings'
                  ? 'bg-primary-light text-primary font-bold shadow-sm'
                  : 'text-secondary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="text-sm font-semibold">{t('settings')}</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer text-secondary hover:bg-surface-container rounded-lg transition-colors text-start"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-sm font-semibold">{t('signout')}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile Top Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-bg-canvas border-b border-border-subtle shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 hover:bg-surface-container rounded-lg text-secondary active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <SbrLogo size={26} color="#24564C" showText={false} />
          {currentPageLabel && (
            <span className="text-sm font-bold text-on-surface">{currentPageLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRecording && appointmentId && (
            <button
              onClick={() => setActivePage(`live-session-${appointmentId}`)}
              className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse"
            >
              <span className="material-symbols-outlined text-[12px]">fiber_manual_record</span>
              {isArabic ? 'جلسة نشطة' : 'Live'}
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs border border-border-subtle shadow-sm uppercase">
            {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${mainMarginClass} bg-bg-canvas min-h-screen ${isAiChat ? 'p-0 pt-14 md:pt-0' : 'p-4 pt-16 md:p-margin-desktop md:pt-0'}`}>
        {children}
      </div>

      {/* Slide-out Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Sheet */}
          <div 
            className={`fixed top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ${
              isArabic 
                ? 'right-0 border-l border-border-subtle' 
                : 'left-0 border-r border-border-subtle'
            }`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <div className="flex items-center gap-2">
                <SbrLogo size={28} color="#24564C" showText={true} textClass="text-primary text-sm" />
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Profile Info block */}
            <div className="p-4 border-b border-border-subtle flex items-center gap-3 bg-primary-light/30">
              <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold border border-border-subtle uppercase">
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface truncate max-w-[170px]">{currentUser.name}</p>
                <p className="text-xs text-on-surface-variant truncate max-w-[170px]">
                  {currentUser.role === 'admin'
                    ? t('super_admin')
                    : currentUser.role === 'org'
                      ? (currentUser.specialty || t('department'))
                      : (currentUser.department || t('doctor'))
                  }
                </p>
              </div>
            </div>

            {/* Menu Items List */}
            <ul className="p-2 space-y-1 flex-1 overflow-y-auto">
              {menuItems.map(item => {
                const isActive = activePage === item.id || (item.id === 'aichat' && activePage?.startsWith('aichat-patient-'));
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActivePage(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-all ${
                        isArabic ? 'text-right' : 'text-left'
                      } ${
                        isActive 
                          ? 'bg-primary text-white font-bold shadow-md' 
                          : 'text-secondary hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span className="text-xs font-bold">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Active Recording Widget inside drawer */}
            {isRecording && appointmentId && (
              <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-start animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">{t('active_recording')}</span>
                </div>
                {patient && (
                  <p className="text-xs font-bold text-on-surface truncate max-w-[210px]">{patient.name}</p>
                )}
                <button
                  onClick={() => {
                    setActivePage(`live-session-${appointmentId}`);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg text-center transition-colors flex items-center justify-center gap-1 shadow-md"
                >
                  <span className="material-symbols-outlined text-[14px]">keyboard_return</span>
                  {t('return_to_session')}
                </button>
              </div>
            )}

            {/* Footer Items List (Settings & Sign out) */}
            <ul className="p-2 border-t border-border-subtle bg-bg-canvas space-y-1">
              <li>
                <button
                  onClick={() => {
                    setActivePage('settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl transition-colors ${
                    isArabic ? 'text-right' : 'text-left'
                  } ${
                    activePage === 'settings'
                      ? 'bg-primary text-white font-bold shadow-md'
                      : 'text-secondary hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                  <span className="text-xs font-bold">{t('settings')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-secondary hover:bg-surface-container rounded-xl transition-colors ${
                    isArabic ? 'text-right' : 'text-left'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="text-xs font-bold">{t('signout')}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showLogoutModal}
        title={t('signout_confirm_title')}
        message={t('signout_confirm_message')}
        confirmLabel={t('yes_logout')}
        cancelLabel={t('cancel')}
        onConfirm={() => {
          logout();
          setShowLogoutModal(false);
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
