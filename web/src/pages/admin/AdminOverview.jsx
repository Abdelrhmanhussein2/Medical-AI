import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function AdminOverview({ setActivePage }) {
  const { organizations, doctors, subscriptions, toggleOrgStatus } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter organizations based on search query
  const filteredOrgs = organizations.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const totalDoctors = doctors.length;
  // Active subscriptions = active organizations + approved independent doctors
  const activeSubs = organizations.filter(o => o.status === 'active').length + 
                     doctors.filter(d => d.status === 'approved' && !d.department_id).length;
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.status === 'active').length;

  // AI Usage Average
  const aiUsageAvg = doctors.length > 0 
    ? Math.round(doctors.reduce((sum, d) => sum + (d.ai_adoption || 0), 0) / doctors.length) 
    : 0;

  // Generate real administrative logs from state data
  const adminLogs = [];
  
  // 1. Add logs for organizations
  organizations.forEach(org => {
    adminLogs.push({
      id: `org-${org.id}`,
      icon: 'corporate_fare',
      iconClass: 'text-primary bg-primary-light',
      text: `${org.name} department registered`,
      time: 'Recently',
      timestamp: Date.now() - 3600000
    });
  });

  // 2. Add logs for doctors
  doctors.forEach(doc => {
    adminLogs.push({
      id: `doc-${doc.id}`,
      icon: 'person_add',
      iconClass: 'text-primary bg-primary-light',
      text: `Dr. ${doc.name} joined ${doc.department || 'Independent'}`,
      time: 'Recently',
      timestamp: Date.now() - 7200000
    });
  });

  // 3. Sort logs by timestamp (newest first)
  adminLogs.sort((a, b) => b.timestamp - a.timestamp);

  // Fallback default logs if database is empty
  const displayLogs = adminLogs.length > 0 ? adminLogs : [
    {
      id: 'init-log',
      icon: 'info',
      iconClass: 'text-secondary bg-surface-container',
      text: 'SBR AI System initialized successfully',
      time: 'Just now'
    }
  ];

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Organization Overview</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Global snapshot of clinical organizations, seats, and subscription health.
          </p>
        </div>
      </header>

      {/* 4 Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Doctors</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{totalDoctors}</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +0 this month
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Subscriptions</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{activeSubs}</span>
            <span class="text-xs font-semibold text-status-warning flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">schedule</span>
              0 expiring
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">AI Usage Avg</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{aiUsageAvg}%</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              Top performing
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Registered Orgs</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{totalOrgs}</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">done_all</span>
              {activeOrgs} active
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Organizations Table (left) */}
        <div class="lg:col-span-8 bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div class="p-6 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-canvas">
              <h3 class="font-button text-sm text-on-surface font-bold">Registered Organizations</h3>
              <div class="relative w-full sm:w-64">
                <span class="material-symbols-outlined absolute left-2.5 top-1/2 transform -translate-y-1/2 text-secondary text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search org or specialty..."
                  class="w-full pl-9 pr-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>
            </div>

            <table class="min-w-full divide-y divide-border-subtle text-left">
              <thead class="bg-bg-canvas/50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Organization</th>
                  <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Specialty</th>
                  <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Doctors</th>
                  <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Subscription</th>
                  <th scope="col" class="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                  <th scope="col" class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-border-subtle text-xs">
                {filteredOrgs.map((org) => {
                  const assignedCount = doctors.filter(d => d.org_id === org.id).length;
                  return (
                    <tr key={org.id} class="hover:bg-surface-container-low transition-colors">
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-bold text-on-surface">{org.name}</div>
                        <div class="text-[10px] text-secondary">{org.email}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-secondary font-semibold">
                        {org.specialty}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-secondary font-bold">
                        {assignedCount} assigned
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="font-semibold text-primary">{org.subscription_plan}</div>
                        <div class="text-[10px] text-secondary">Expires {org.subscription_expiry}</div>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap">
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          org.status === 'active' 
                            ? 'bg-primary-light text-primary' 
                            : 'bg-error-container text-error'
                        }`}>
                          {org.status}
                        </span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                        <div class="flex gap-2 justify-end">
                          <button
                            onClick={() => toggleOrgStatus(org.id)}
                            class={`px-2.5 py-1 rounded transition-colors text-[10px] font-bold ${
                              org.status === 'active'
                                ? 'bg-error-container/10 hover:bg-error-container text-error'
                                : 'bg-primary-light text-primary hover:bg-primary/20'
                            }`}
                          >
                            {org.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div class="p-4 border-t border-border-subtle bg-bg-canvas/30 text-right">
            <button 
              onClick={() => setActivePage('admin-users')}
              class="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-auto"
            >
              Manage all departments and users
              <span class="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Recent Activity (right) */}
        <div class="lg:col-span-4 bg-white border border-border-subtle rounded-xl shadow-sm p-6 flex flex-col justify-between">
          <div class="space-y-4">
            <h3 class="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              Administrative Log
            </h3>
            
            <div class="space-y-4 text-xs leading-relaxed max-h-[360px] overflow-y-auto pr-1">
              {displayLogs.map(log => (
                <div key={log.id} class="flex gap-3 items-start">
                  <span class={`material-symbols-outlined p-1 rounded ${log.iconClass}`}>{log.icon}</span>
                  <div>
                    <p class="font-bold text-on-surface">{log.text}</p>
                    <span class="text-[10px] text-secondary">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div class="border-t border-border-subtle pt-4 mt-4">
            <button 
              onClick={() => setActivePage('admin-subscriptions')}
              class="w-full text-center py-2 bg-bg-canvas hover:bg-surface-container rounded-lg text-xs font-bold text-secondary transition-colors"
            >
              Review Billing & Licenses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
