import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function PrivacySection() {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm animate-fade-in text-start space-y-4">
      <h2 className="text-lg font-bold text-primary flex items-center gap-2">
        <span className="material-symbols-outlined">verified_user</span>
        {t('privacy_policy')}
      </h2>

      <div className="p-4 bg-primary-light/50 border border-primary/20 rounded-xl">
        <div className="flex gap-2 items-center text-primary font-bold text-xs uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-sm">shield_locked</span>
          <span>HIPAA & SOC2 SECURED Workspace</span>
        </div>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {t('privacy_text')}
        </p>
      </div>

      <div className="text-[11px] text-secondary space-y-1">
        <p>• End-to-end encryption for all real-time voice consultations.</p>
        <p>• Automatic deletion of local audio cache after successful translation.</p>
        <p>• Role-based access control protecting patient files from unauthorized internal reads.</p>
      </div>
    </div>
  );
}
