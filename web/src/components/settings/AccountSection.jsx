import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AccountSection() {
  const { currentUser, updateProfile } = useApp();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [specialization, setSpecialization] = useState(currentUser?.specialization || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await updateProfile(name, email, specialization);
      setMessage(t('update_success'));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || t('update_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-6 shadow-sm animate-fade-in text-start">
      <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">person</span>
        {t('account_info')}
      </h2>

      {message && (
        <div className="mb-4 p-3 bg-success/10 text-success rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('full_name')}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas disabled:opacity-75 disabled:cursor-not-allowed text-on-surface"
            disabled={!isEditing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('email_address')}
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas disabled:opacity-75 disabled:cursor-not-allowed text-on-surface"
            disabled={!isEditing}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant mb-1">
            {t('specialization')}
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-bg-canvas disabled:opacity-75 disabled:cursor-not-allowed text-on-surface"
            disabled={!isEditing}
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end pt-2">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg border border-border-subtle transition-colors"
                onClick={() => {
                  setName(currentUser?.name || '');
                  setEmail(currentUser?.email || '');
                  setSpecialization(currentUser?.specialization || '');
                  setIsEditing(false);
                  setError('');
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                {loading && <span className="animate-spin material-symbols-outlined text-xs">refresh</span>}
                {t('save_changes')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
              onClick={() => setIsEditing(true)}
            >
              {t('edit')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
