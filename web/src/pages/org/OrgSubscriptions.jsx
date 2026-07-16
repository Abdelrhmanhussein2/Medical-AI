import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const PLANS = [
  { id: 'basic', label: 'Basic Access', price: 200 },
  { id: 'trial', label: 'Trial Access', price: 0 },
  { id: 'clinical_pro', label: 'Clinical Pro', price: 500 },
  { id: 'pro_ai', label: 'Pro AI Suite', price: 900 },
  { id: 'enterprise', label: 'Enterprise AI', price: 1500 },
];

export default function OrgSubscriptions() {
  const { currentUser, doctors, activateSubscription, apiFetch } = useApp();
  const [filterStatus, setFilterStatus] = useState('all');
  const [orgSubscription, setOrgSubscription] = useState(null);

  // Load the org's own subscription
  useEffect(() => {
    const loadOrgSub = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('/api/v1/subscriptions/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrgSubscription(data || { bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
        } else {
            setOrgSubscription({ bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
        }
      } catch (e) {
        console.error('Failed to load org subscription', e);
        setOrgSubscription({ bundle_name: 'Pro AI Suite (Mock)', end_date: '2026-12-31' });
      }
    };
    loadOrgSub();
  }, []);

  // Subscribe modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('pro_ai');
  const [expiryDate, setExpiryDate] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  // All doctors in state are already scoped to this department
  const deptDocs = doctors;

  // Build license info
  const docLicenses = deptDocs.map(doc => {
    const expiryDateVal = doc.subscription_expiry || null;
    let licenseStatus = doc.status === 'pending' ? 'pending' : 'active';
    let daysRemaining = null;

    if (expiryDateVal) {
      const today = new Date();
      const expiry = new Date(expiryDateVal);
      daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        licenseStatus = 'expired';
      } else if (daysRemaining <= 30) {
        licenseStatus = 'expiring';
      } else {
        licenseStatus = 'active';
      }
    } else if (doc.status === 'pending' || doc.status === 'rejected') {
      licenseStatus = 'pending';
    }

    return {
      id: doc.id,
      doctorName: doc.name,
      doctorEmail: doc.email,
      // Use org's plan if doctor has no individual plan
      planTier: doc.subscription_plan || (orgSubscription ? orgSubscription.bundle_name : null) || '—',
      renewalDate: expiryDateVal ? new Date(expiryDateVal).toLocaleDateString() : (orgSubscription?.end_date ? new Date(orgSubscription.end_date).toLocaleDateString() : '—'),
      daysRemaining,
      status: licenseStatus,
      rawDoc: doc
    };
  });

  const filteredLicenses = docLicenses.filter(license => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return license.status === 'pending';
    if (filterStatus === 'active') return license.status === 'active';
    if (filterStatus === 'expiring') return license.status === 'expiring';
    if (filterStatus === 'expired') return license.status === 'expired';
    return true;
  });

  const seatsUtilized = deptDocs.filter(d => d.status === 'approved').length;
  const totalSeats = deptDocs.length || 0;
  const capacityPct = totalSeats > 0 ? Math.round((seatsUtilized / totalSeats) * 100) : 0;
  const pendingCount = docLicenses.filter(l => l.status === 'pending').length;
  const expiringSoonCount = docLicenses.filter(l => l.status === 'expiring').length;

  const openSubscribeModal = (license) => {
    setSelectedDoc(license);
    setSelectedPlan('pro_ai');
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setExpiryDate(d.toISOString().split('T')[0]);
    setSubError('');
    setShowSubModal(true);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setSubLoading(true);
    setSubError('');
    try {
      const planLabel = PLANS.find(p => p.id === selectedPlan)?.label || selectedPlan;
      await activateSubscription(selectedDoc.id, planLabel, expiryDate);
      setShowSubModal(false);
    } catch (err) {
      setSubError(err.message || 'Failed to activate subscription');
    } finally {
      setSubLoading(false);
    }
  };

  const statusBadge = (status, daysRemaining) => {
    const classes = {
      active: 'bg-primary-light text-primary',
      expiring: 'bg-status-warning/10 text-status-warning',
      expired: 'bg-error-container text-error',
      pending: 'bg-surface-container-high text-secondary',
    };
    const labels = {
      active: `Active${daysRemaining !== null ? ` (${daysRemaining}d)` : ''}`,
      expiring: `Expiring Soon (${daysRemaining}d)`,
      expired: 'Expired',
      pending: 'Pending Activation',
    };
    return (
      <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${classes[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <div class="flex items-center gap-1.5 text-xs text-secondary font-semibold">
            <span>{currentUser.name}</span>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>Subscriptions</span>
          </div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold mt-1">Department Subscriptions</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Manage clinician seat allocation and activate doctor accounts.
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Seat Utilization</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{seatsUtilized} / {totalSeats}</span>
            <span class="text-xs font-semibold text-primary">{capacityPct}% active</span>
          </div>
          <div class="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-2">
            <div class="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${capacityPct}%` }}></div>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-status-warning/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Pending Activation</span>
          <div class="flex items-baseline gap-2">
            <span class={`text-4xl font-bold font-display-lg ${pendingCount > 0 ? 'text-status-warning' : 'text-on-surface'}`}>{pendingCount}</span>
            <span class="text-xs font-semibold text-status-warning">
              {pendingCount > 0 ? 'Needs Subscription' : 'All Active'}
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-error/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Expiring Licenses (30d)</span>
          <div class="flex items-baseline gap-2">
            <span class={`text-4xl font-bold font-display-lg ${expiringSoonCount > 0 ? 'text-error' : 'text-on-surface'}`}>{expiringSoonCount}</span>
            <span class="text-xs font-semibold text-error">{expiringSoonCount > 0 ? 'Review Renewals' : 'None'}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div class="flex flex-col sm:flex-row justify-start gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Activation</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle text-left">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Doctor / Clinician</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Current Plan</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Expiry Date</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              <th scope="col" class="relative px-6 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle text-xs">
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-secondary text-sm">
                  No doctors found
                </td>
              </tr>
            ) : (
              filteredLicenses.map((license) => (
                <tr key={license.id} class={`hover:bg-surface-container-low transition-colors ${license.status === 'pending' ? 'bg-status-warning/5' : ''}`}>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                        {license.doctorName?.[0] || '?'}
                      </div>
                      <div>
                        <div class="font-bold text-on-surface">{license.doctorName}</div>
                        <div class="text-[10px] text-secondary">{license.doctorEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {license.planTier && license.planTier !== '—' ? (
                      <span class="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full">
                        <span class="material-symbols-outlined text-[13px]">workspace_premium</span>
                        {license.planTier}
                      </span>
                    ) : (
                      <span class="text-secondary font-semibold text-xs">—</span>
                    )}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {license.renewalDate}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {statusBadge(license.status, license.daysRemaining)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    {(license.status === 'pending' || license.status === 'expired' || license.status === 'expiring') && (
                      <button
                        onClick={() => openSubscribeModal(license)}
                        class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1 ml-auto"
                      >
                        <span class="material-symbols-outlined text-[14px]">subscriptions</span>
                        {license.status === 'pending' ? 'Activate Subscription' : 'Renew'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Subscribe Modal */}
      {showSubModal && selectedDoc && (
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl border border-border-subtle shadow-lg max-w-md w-full overflow-hidden animate-fade-in">
            <div class="px-6 py-4 border-b border-border-subtle flex justify-between items-center bg-bg-canvas">
              <div>
                <h3 class="font-headline-md text-base text-primary font-bold">Activate Subscription</h3>
                <p class="text-xs text-secondary mt-0.5">for Dr. {selectedDoc.doctorName}</p>
              </div>
              <button onClick={() => setShowSubModal(false)} class="p-1 hover:bg-surface-container rounded-full text-secondary">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleActivate} class="p-6 space-y-4">
              {subError && (
                <div class="bg-error-container text-error text-xs p-3 rounded-lg flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">error</span>
                  {subError}
                </div>
              )}

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-2">Choose Plan</label>
                <div class="space-y-2">
                  {PLANS.map(plan => (
                    <label
                      key={plan.id}
                      class={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlan === plan.id
                          ? 'border-primary bg-primary-light'
                          : 'border-border-subtle hover:bg-surface-container-low'
                      }`}
                    >
                      <div class="flex items-center gap-2">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={selectedPlan === plan.id}
                          onChange={() => setSelectedPlan(plan.id)}
                          class="accent-primary"
                        />
                        <span class="text-xs font-semibold text-on-surface">{plan.label}</span>
                      </div>
                      <span class="text-xs font-bold text-primary">
                        {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-on-surface-variant mb-1">Subscription Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  class="w-full px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div class="flex gap-3 mt-6 pt-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  class="flex-1 bg-white border border-border-subtle text-secondary font-button py-2 rounded-lg text-xs hover:bg-surface-container-low transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subLoading}
                  class="flex-1 bg-primary hover:bg-primary-hover text-on-primary font-button py-2 rounded-lg text-xs transition-colors shadow-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {subLoading ? (
                    <><span class="material-symbols-outlined animate-spin text-[14px]">progress_activity</span> Activating...</>
                  ) : (
                    'Activate & Enable Doctor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
