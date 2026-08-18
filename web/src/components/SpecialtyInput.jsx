import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SPECIALTIES } from '../data/specialties';

/**
 * SpecialtyInput — حقل إدخال تخصص طبي ذكي
 *
 * المميزات:
 * - Autocomplete: أثناء الكتابة يعرض أقرب تخصصات من القائمة
 * - البحث يعمل بالعربي والإنجليزي في نفس الوقت
 * - زر "أخرى / Other" للكتابة الحرة
 * - إمكانية اختيار من القائمة أو الكتابة يدوياً
 */
export default function SpecialtyInput({ value, onChange, isArabic, required = false, label }) {
  const [query, setQuery] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // مزامنة الـ query مع value الخارجية
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // فلترة التخصصات بناءً على ما كتبه المستخدم
  const filtered = useCallback(() => {
    if (!query.trim()) return SPECIALTIES;
    const q = query.toLowerCase().trim();
    return SPECIALTIES.filter(s =>
      s.val.toLowerCase().includes(q) ||
      s.ar.includes(query) ||
      s.ar.toLowerCase().includes(q)
    );
  }, [query]);

  const suggestions = filtered();

  const handleSelect = (spec) => {
    const label = isArabic ? spec.ar : spec.val;
    if (spec.val === 'Other') {
      setIsCustomMode(true);
      setQuery('');
      onChange('');
      setShowDropdown(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery(label);
      onChange(spec.val);
      setShowDropdown(false);
      setIsCustomMode(false);
    }
    setHighlightIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (isCustomMode) {
      onChange(val);
    } else {
      onChange(val);
      setShowDropdown(true);
      setHighlightIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || isCustomMode) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exitCustomMode = () => {
    setIsCustomMode(false);
    setQuery('');
    onChange('');
    setShowDropdown(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className={`block text-sm font-semibold text-on-surface-variant ${isArabic ? 'text-right' : 'text-left'}`}>
          {label}
        </label>
      )}

      <div className="relative">
        {/* حقل الإدخال */}
        <div className={`flex items-center gap-2 w-full px-4 py-2.5 bg-white border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all ${isCustomMode ? 'border-primary bg-primary-light/10' : 'border-border-subtle'}`}>
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
            {isCustomMode ? 'edit' : 'medical_services'}
          </span>

          <input
            ref={inputRef}
            type="text"
            required={required}
            value={query}
            onChange={handleInputChange}
            onFocus={() => { if (!isCustomMode) setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            placeholder={
              isCustomMode
                ? (isArabic ? 'اكتب تخصصك هنا...' : 'Type your specialty...')
                : (isArabic ? 'ابحث بالعربي أو الإنجليزي...' : 'Search in Arabic or English...')
            }
            className={`flex-1 bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-secondary/60 ${isArabic ? 'text-right' : 'text-left'}`}
          />

          {/* أيقونة المسح */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onChange('');
                setIsCustomMode(false);
                setShowDropdown(true);
                inputRef.current?.focus();
              }}
              className="text-secondary hover:text-error transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}

          {/* سهم فتح/إغلاق */}
          {!isCustomMode && (
            <span
              className={`material-symbols-outlined text-[18px] text-secondary shrink-0 transition-transform duration-200 cursor-pointer ${showDropdown ? 'rotate-180' : ''}`}
              onClick={() => setShowDropdown(v => !v)}
            >
              expand_more
            </span>
          )}

          {/* زر الخروج من الوضع المخصص */}
          {isCustomMode && (
            <button
              type="button"
              onClick={exitCustomMode}
              className="text-xs text-secondary hover:text-primary font-semibold shrink-0 flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">list</span>
              {isArabic ? 'قائمة' : 'List'}
            </button>
          )}
        </div>

        {/* شارة الوضع المخصص */}
        {isCustomMode && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px] text-primary">info</span>
            <p className="text-[10px] text-primary font-semibold">
              {isArabic ? 'وضع الإدخال الحر — اكتب تخصصك' : 'Custom input mode — type your specialty'}
            </p>
          </div>
        )}

        {/* القائمة المنسدلة */}
        {showDropdown && !isCustomMode && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-border-subtle rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in">
            {suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-secondary text-center">
                {isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}
              </div>
            ) : (
              <>
                {suggestions.map((spec, idx) => (
                  <button
                    key={spec.val}
                    type="button"
                    onMouseDown={() => handleSelect(spec)}
                    className={`w-full px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse text-right' : 'text-left'} ${
                      highlightIndex === idx ? 'bg-primary-light text-primary' : 'hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <span className="font-semibold">{isArabic ? spec.ar : spec.val}</span>
                    <span className="text-xs text-secondary shrink-0">{isArabic ? spec.val : spec.ar}</span>
                  </button>
                ))}

                {/* فاصل وزر "أخرى" */}
                <div className="border-t border-border-subtle">
                  <button
                    type="button"
                    onMouseDown={() => handleSelect({ val: 'Other', ar: 'أخرى' })}
                    className={`w-full px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary-light/50 transition-colors flex items-center gap-2 ${isArabic ? 'flex-row-reverse justify-end' : ''}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    {isArabic ? 'أخرى — أكتب تخصصي بنفسي' : 'Other — Type my own specialty'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
