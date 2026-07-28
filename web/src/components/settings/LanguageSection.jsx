import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSection() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm animate-fade-in text-start">
      <h2 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined">language</span>
        {t('language')}
      </h2>
      <p className="text-secondary text-xs mb-4">
        {t('language_select_title')}
      </p>

      <div className="flex gap-4">
        {/* Arabic option */}
        <label className={`flex-1 flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
          lang === 'ar' 
            ? 'border-primary bg-primary-light text-primary font-bold' 
            : 'border-border-subtle hover:bg-surface-container text-secondary'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">translate</span>
            <span className="text-sm">{t('arabic')}</span>
          </div>
          <input
            type="radio"
            name="lang"
            value="ar"
            checked={lang === 'ar'}
            onChange={() => setLang('ar')}
            className="accent-primary h-4 w-4"
          />
        </label>

        {/* English option */}
        <label className={`flex-1 flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
          lang === 'en' 
            ? 'border-primary bg-primary-light text-primary font-bold' 
            : 'border-border-subtle hover:bg-surface-container text-secondary'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">translate</span>
            <span className="text-sm">{t('english')}</span>
          </div>
          <input
            type="radio"
            name="lang"
            value="en"
            checked={lang === 'en'}
            onChange={() => setLang('en')}
            className="accent-primary h-4 w-4"
          />
        </label>
      </div>
    </div>
  );
}
