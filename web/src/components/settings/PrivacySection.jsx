import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function PrivacySection() {
  const { t, isArabic } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm animate-fade-in text-start space-y-5">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        <span className="material-symbols-outlined">verified_user</span>
        {t('privacy_policy')}
      </h2>

      <div className="p-4 bg-primary-light/50 border border-primary/20 rounded-xl">
        <div className="flex gap-2 items-center text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-sm">shield_locked</span>
          <span>{isArabic ? 'بيئة عمل مشفرة وآمنة' : 'Encrypted & Secured Workspace'}</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {t('privacy_text')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-primary-light/40 border border-primary/10 rounded-xl space-y-1">
          <h4 className="font-bold text-primary flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px]">mic</span>
            {t('privacy_section_1_title')}
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('privacy_section_1_desc')}
          </p>
        </div>

        <div className="p-4 bg-tertiary-fixed/30 border border-tertiary/10 rounded-xl space-y-1">
          <h4 className="font-bold text-secondary flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            {t('privacy_section_2_title')}
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('privacy_section_2_desc')}
          </p>
        </div>

        <div className="p-4 bg-surface-container-low border border-border-subtle rounded-xl space-y-1">
          <h4 className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            {t('privacy_section_3_title')}
          </h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('privacy_section_3_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}
