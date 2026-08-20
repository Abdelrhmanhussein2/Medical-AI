import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  isArabic = false,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    } else {
      // Focus search input when dropdown opens
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter(opt => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    
    const labelMatch = (opt.label || '').toLowerCase().includes(term);
    const sublabelMatch = (opt.sublabel || '').toLowerCase().includes(term);
    const valueMatch = (opt.value || '').toLowerCase().includes(term);
    
    return labelMatch || sublabelMatch || valueMatch;
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isArabic ? 'rtl text-right' : 'ltr text-left'} ${className}`}>
      {/* Select Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-border-subtle rounded-lg text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:border-border-subtle/80 transition-all duration-200 cursor-pointer"
      >
        <span className={selectedOption ? 'text-on-surface' : 'text-secondary'}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.sublabel && (
                <span className="font-mono text-xs text-primary font-bold bg-primary-light px-1.5 py-0.5 rounded">
                  {selectedOption.sublabel}
                </span>
              )}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="material-symbols-outlined text-secondary shrink-0 transition-transform duration-200 select-none">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border-subtle rounded-xl shadow-lg max-h-[300px] flex flex-col overflow-hidden animate-fade-in">
          {/* Search Box */}
          <div className="p-2 border-b border-border-subtle/60 flex items-center gap-2 bg-surface-container-low shrink-0">
            <span className="material-symbols-outlined text-secondary text-[20px] select-none pl-1">search</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none text-sm outline-none text-on-surface placeholder:text-secondary focus:ring-0 p-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-secondary hover:text-on-surface p-0.5 rounded-full hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 max-h-[220px] py-1 select-none">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs text-secondary font-semibold">
                {isArabic ? 'لا توجد نتائج مطابقة' : 'No matches found'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-primary-light/50 text-primary font-bold'
                        : 'text-on-surface hover:bg-surface-container-low'
                    } ${isArabic ? 'text-right' : 'text-left'}`}
                  >
                    <span className="flex items-center gap-2">
                      {opt.sublabel && (
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-primary/20 text-primary font-bold' : 'bg-surface-container text-secondary'
                        }`}>
                          {opt.sublabel}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
