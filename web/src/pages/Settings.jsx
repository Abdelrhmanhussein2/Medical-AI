import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import AccountSection from '../components/settings/AccountSection';
import LanguageSection from '../components/settings/LanguageSection';
import PrivacySection from '../components/settings/PrivacySection';
import DangerSection from '../components/settings/DangerSection';

export default function Settings() {
  const { t, isArabic } = useLanguage();
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: t('account_info'), icon: 'person' },
    { id: 'language', label: t('language'), icon: 'language' },
    { id: 'privacy', label: t('privacy_policy'), icon: 'verified_user' },
    { id: 'danger', label: t('danger_zone'), icon: 'gpp_maybe', danger: true },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 text-start">
        <h1 className="text-2xl font-headline-lg font-bold text-primary mb-1">
          {t('settings_title')}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Tab Sidebar Selector */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl border border-border-subtle p-3 h-fit space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-start ${
                  isActive
                    ? tab.danger
                      ? 'bg-error-container text-error font-extrabold shadow-sm'
                      : 'bg-primary-light text-primary font-extrabold shadow-sm'
                    : tab.danger
                      ? 'text-error hover:bg-error-container/40'
                      : 'text-secondary hover:bg-surface-container'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill' : ''}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Tab Content Display */}
        <div className="flex-1">
          {activeTab === 'account' && <AccountSection />}
          {activeTab === 'language' && <LanguageSection />}
          {activeTab === 'privacy' && <PrivacySection />}
          {activeTab === 'danger' && <DangerSection />}
        </div>
      </div>
    </div>
  );
}
