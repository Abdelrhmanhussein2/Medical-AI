import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminSubscriptions() {
  const { subscriptions, renewSubscription } = useApp();
  const [filterType, setFilterType] = useState('all'); // all, doctor, org
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expiring, expired
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering logic
  const filteredSubs = subscriptions.filter(sub => {
    const matchesSearch = sub.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.plan_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || sub.entity_type === filterType;
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Subscription Health</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Monitor plan distribution, active subscriptions, renewals, and revenue flows.
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Licenses</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">1,248</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +10% vs last month
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Expiring (7 days)</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg font-bold text-status-warning">42</span>
            <span class="text-xs font-semibold text-status-warning flex items-center gap-0.5">
              Action Required
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Expired Plans</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg text-error">18</span>
            <span class="text-xs font-semibold text-error flex items-center gap-0.5">
              -3% retention drop
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">YTD Total Revenue</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">$1.2M</span>
            <span class="text-xs font-semibold text-secondary">
              ARR Run Rate
            </span>
          </div>
        </div>
      </div>

      {/* Filter and search panel */}
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-border-subtle rounded-xl shadow-sm">
        <div class="flex gap-2 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
          >
            <option value="all">All Entity Types</option>
            <option value="doctor">Doctors Only</option>
            <option value="org">Organizations Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            class="bg-white border border-border-subtle rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-secondary font-semibold"
          >
            <option value="all">All Subscriptions</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div class="relative w-full sm:w-64">
          <span class="material-symbols-outlined absolute left-2.5 top-1/2 transform -translate-y-1/2 text-secondary text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account name or plan..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div class="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <table class="min-w-full divide-y divide-border-subtle text-left">
          <thead class="bg-bg-canvas">
            <tr>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Account / Entity</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Type</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Plan Details</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Days Left</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Payment</th>
              <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-border-subtle text-xs">
            {filteredSubs.length === 0 ? (
              <tr>
                <td colSpan="7" class="px-6 py-8 text-center text-secondary text-sm">
                  No subscription records found
                </td>
              </tr>
            ) : (
              filteredSubs.map((sub) => (
                <tr key={sub.id} class="hover:bg-surface-container-low transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-bold text-on-surface text-xs">{sub.entity_name}</div>
                    <div class="text-[10px] text-secondary">Expiry Date: {sub.expiry_date}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sub.entity_type === 'org' 
                        ? 'bg-primary-light text-primary' 
                        : 'bg-surface-container-high text-secondary'
                    }`}>
                      {sub.entity_type === 'org' ? 'Organization' : 'Doctor'}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-bold text-on-surface">{sub.plan_name}</div>
                    <div class="text-[10px] text-secondary">${sub.monthly_cost}/month recurring</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-secondary font-bold">
                    {sub.status === 'expired' ? (
                      <span class="text-error">0 days (Expired)</span>
                    ) : (
                      <span>{sub.days_remaining} days left</span>
                    )}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sub.payment_status === 'paid' 
                        ? 'bg-primary-light text-primary' 
                        : sub.payment_status === 'pending'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-error-container text-error'
                    }`}>
                      {sub.payment_status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      sub.status === 'active' 
                        ? 'bg-primary-light text-primary' 
                        : sub.status === 'expiring'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-error-container text-error'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                    <div class="flex gap-2 justify-end">
                      <button
                        onClick={() => renewSubscription(sub.id)}
                        class="px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-on-primary transition-colors text-[10px] font-bold shadow-sm"
                      >
                        Renew (+30 Days)
                      </button>
                    </div>
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
