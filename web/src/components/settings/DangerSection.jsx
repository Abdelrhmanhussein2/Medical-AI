import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import ConfirmModal from '../modals/ConfirmModal';

export default function DangerSection() {
  const { deleteAccount } = useApp();
  const { t } = useLanguage();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteAccount();
    } catch (err) {
      setError(err.message || 'Failed to delete account');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-error/20 p-6 shadow-sm animate-fade-in text-start space-y-4">
      <h2 className="text-lg font-bold text-error flex items-center gap-2">
        <span className="material-symbols-outlined">gpp_maybe</span>
        {t('danger_zone')}
      </h2>

      <p className="text-secondary text-xs leading-relaxed">
        {t('delete_account_desc')}
      </p>

      {error && (
        <div className="p-3 bg-error-container text-error rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <div>
        <button
          type="button"
          disabled={loading}
          className="bg-error hover:bg-error/90 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          onClick={() => setShowConfirmModal(true)}
        >
          {loading && <span className="animate-spin material-symbols-outlined text-xs">refresh</span>}
          {t('delete_account_btn')}
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title={t('delete_confirm_title')}
        message={t('delete_confirm_message')}
        confirmLabel={t('yes_delete')}
        cancelLabel={t('cancel')}
        danger={true}
        requireInputVal="DELETE"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
