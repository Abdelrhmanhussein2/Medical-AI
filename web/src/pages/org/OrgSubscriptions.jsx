import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function OrgSubscriptions() {
  const { currentUser, doctors, subscriptions, renewSubscription } = useApp();
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Get department doctors
  const deptDocs = doctors.filter(d => d.org_id === currentUser.id);

  // Subscriptions belonging to this org's doctors
  // Dr. Ahmed Hassan: Pro AI Suite, expires 2026-12-31 (Active)
  // Dr. Julian Vance: Pro AI Suite, expires 2026-08-10 (Expiring Soon)
  // Dr. Emily Rostova: Standard Tier, expired 2026-07-12 (Expired)
  const docLicenses = deptDocs.map(doc => {
    let licenseStatus = 'active';
    let daysLeft = 138;
    let cost = 1200;

    if (doc.id === 'a3a2a1a0-b0c0-d0e0-f0a0-b0c0d0e0f0a0') {
      licenseStatus = 'expiring';
      daysLeft = 14;
      cost = 1200;
    } else if (doc.status === 'disabled') {
      licenseStatus = 'expired';
      daysLeft = 0;
      cost = 300;
    }

    return {
      id: doc.id,
      doctorName: doc.name,
      doctorEmail: doc.email,
      planTier: doc.subscription_plan || 'Pro AI Suite',
      renewalDate: doc.subscription_expiry || '2026-12-31',
      daysRemaining: daysLeft,
      monthlyCost: cost,
      status: licenseStatus
    };
  });

  // Filter roster
  const filteredLicenses = docLicenses.filter(license => {
    const matchesTier = filterTier === 'all' || license.planTier.toLowerCase().includes(filterTier.toLowerCase());
    const matchesStatus = filterStatus === 'all' || license.status === filterStatus;
    return matchesTier && matchesStatus;
  });

  // Seats statistics
  const seatsUtilized = deptDocs.filter(d => d.status === 'approved').length;
  const totalSeats = 50; // Mock total seats
  const monthlyCostTotal = docLicenses.reduce((acc, curr) => acc + curr.monthlyCost, 0);
  const expiringSoonCount = docLicenses.filter(l => l.status === 'expiring').length;

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
            Manage clinician seat allocation, track billing costs, and renew expiring licenses.
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Seat Utilization</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{seatsUtilized} / {totalSeats}</span>
            <span class="text-xs font-semibold text-primary">
              94% capacity
            </span>
          </div>
          <div class="w-full bg-surface-container rounded-full h-1.5 overflow-hidden mt-2">
            <div class="bg-primary h-full rounded-full" style={{ width: '4%' }}></div>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Monthly Recurring Cost</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">${monthlyCostTotal.toLocaleString()}</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              +2.4% vs last month
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Expiring Licenses (30d)</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg text-status-warning">{expiringSoonCount}</span>
            <span class="text-xs font-semibold text-status-warning">Review Renewals</span>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div class="flex flex-col sm:flex-row justify-start gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
        >
          <option value="all">All Plan Tiers</option>
          <option value="pro">Pro AI Suite</option>
          <option value="standard">Standard Tier</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle text-left">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Doctor / Clinician</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Current Plan Tier</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Next Renewal</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">License Health</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle text-xs">
            {filteredLicenses.length === 0 ? (
              <tr>
                <td colSpan="5" class="px-6 py-8 text-center text-secondary text-sm">
                  No subscriptions match the selected criteria
                </td>
              </tr>
            ) : (
              filteredLicenses.map((license) => (
                <tr key={license.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-bold text-on-surface text-xs">{license.doctorName}</div>
                    <div class="text-[10px] text-secondary">{license.doctorEmail}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-bold text-on-surface">{license.planTier}</div>
                    <div class="text-[10px] text-secondary">${license.monthlyCost}/month recurring</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                    {license.renewalDate}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      license.status === 'active' 
                        ? 'bg-primary-light text-primary' 
                        : license.status === 'expiring'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-error-container text-error'
                    }`}>
                      {license.status === 'active' && `Active (${license.daysRemaining}d)`}
                      {license.status === 'expiring' && `Expiring Soon (${license.daysRemaining}d)`}
                      {license.status === 'expired' && 'Expired'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                    {license.status !== 'active' && (
                      <button
                        onClick={() => alert('License renewal action simulated successfully!')}
                        class="px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-on-primary transition-colors text-[10px] font-bold shadow-sm"
                      >
                        Renew License
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
