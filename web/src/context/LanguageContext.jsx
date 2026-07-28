import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('lang') || 'ar';
  });

  const setLang = (newLang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  };

  const t = (key, params = {}) => {
    let translation = translations[lang]?.[key] || translations['en']?.[key] || key;
    
    // Replace parameters like {mins} or {plan}
    Object.keys(params).forEach(paramKey => {
      translation = translation.replace(`{${paramKey}}`, params[paramKey]);
    });
    
    return translation;
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isArabic = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isArabic }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
