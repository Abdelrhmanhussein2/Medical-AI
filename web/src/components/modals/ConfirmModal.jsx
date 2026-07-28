import React, { useState } from 'react';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel, 
  onConfirm, 
  onCancel, 
  danger = false,
  requireInputVal = null // Optional text that must be matched to enable confirm button
}) {
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const isConfirmedDisabled = requireInputVal && inputVal !== requireInputVal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl border border-border-subtle shadow-ambient p-6 w-full max-w-md z-10 transform scale-100 transition-all duration-300 animate-scale-up text-right">
        <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${danger ? 'text-error' : 'text-primary'}`}>
          <span className="material-symbols-outlined">
            {danger ? 'warning' : 'help'}
          </span>
          {title}
        </h3>
        
        <p className="text-secondary text-sm leading-relaxed mb-4">
          {message}
        </p>

        {requireInputVal && (
          <div className="mb-4">
            <input 
              type="text"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={requireInputVal}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button 
            type="button"
            className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg transition-colors border border-border-subtle"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          
          <button 
            type="button"
            disabled={isConfirmedDisabled}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
              danger 
                ? 'bg-error hover:bg-error/90' 
                : 'bg-primary hover:bg-primary-hover'
            }`}
            onClick={() => {
              onConfirm();
              setInputVal('');
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
