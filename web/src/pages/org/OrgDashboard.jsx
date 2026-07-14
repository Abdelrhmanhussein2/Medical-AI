import React from 'react';
import { useApp } from '../../context/AppContext';

export default function OrgDashboard({ setActivePage }) {
  const { currentUser, doctors, subscriptions, renewSubscription } = useApp();

  // Get department doctors
  const deptDocs = doctors.filter(d => d.org_id === currentUser.id);
  const totalDocs = deptDocs.length;
  const activeSeats = deptDocs.filter(d => d.status === 'approved').length;

  // Filter subscriptions for this org
  const orgSub = subscriptions.find(s => s.entity_id === currentUser.id);

  // Expiring licenses alerts (mocked from active doctors in this department)
  const expiringDoctors = deptDocs.filter(d => {
    // Julian Vance has 14 days left
    return d.subscription_expiry && new Date(d.subscription_expiry) < new Date('2026-08-15');
  });

  return (
    <div class="space-y-stack-lg font-body-md animate-fade-in">
      {/* Header */}
      <header class="flex justify-between items-end border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">
            {currentUser.name} Dashboard
          </h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">
            Overview of clinical department operations, AI tool adoption, and license allocations.
          </p>
        </div>
      </header>

      {/* 4 Stats Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Total Doctors</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{totalDocs}</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +2 this month
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Active Licenses</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">{activeSeats}</span>
            <span class="text-xs font-semibold text-secondary">
              / 42 allocated seats
            </span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">AI Adoption Rate</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">86%</span>
            <span class="text-xs font-semibold text-primary">High Usage</span>
          </div>
        </div>

        <div class="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div class="absolute right-0 top-0 w-24 h-24 bg-tertiary-fixed-dim/5 rounded-full blur-2xl"></div>
          <span class="text-xs font-semibold text-secondary uppercase tracking-wider block">Monthly Consults</span>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-bold text-on-surface font-display-lg">1,240</span>
            <span class="text-xs font-semibold text-primary flex items-center gap-0.5">
              <span class="material-symbols-outlined text-xs">trending_up</span>
              +5%
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: Consultation Trends SVG Chart */}
        <div class="lg:col-span-8 space-y-6">
          <div class="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <div class="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 class="font-button text-sm text-on-surface font-bold">Consultation Trends</h3>
              <span class="text-xs text-secondary font-semibold bg-bg-canvas px-2.5 py-1 rounded">Last 30 Days</span>
            </div>
            
            {/* CSS & SVG Chart */}
            <div class="h-64 w-full flex items-end justify-between relative pt-6 px-4">
              {/* Grid Lines */}
              <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div class="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">150</div>
                <div class="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">100</div>
                <div class="w-full border-t border-border-subtle/50 text-[10px] text-secondary text-right pr-2 pt-1">50</div>
                <div class="w-full border-t border-border-subtle text-[10px] text-secondary text-right pr-2 pt-1">0</div>
              </div>

              {/* Bar columns */}
              <div class="w-10 h-full flex flex-col justify-end items-center z-10">
                <div class="w-4 bg-primary rounded-t-sm" style={{ height: '40%' }}></div>
                <span class="text-[10px] text-secondary mt-2">Week 1</span>
              </div>
              <div class="w-10 h-full flex flex-col justify-end items-center z-10">
                <div class="w-4 bg-primary rounded-t-sm" style={{ height: '65%' }}></div>
                <span class="text-[10px] text-secondary mt-2">Week 2</span>
              </div>
              <div class="w-10 h-full flex flex-col justify-end items-center z-10">
                <div class="w-4 bg-primary rounded-t-sm" style={{ height: '85%' }}></div>
                <span class="text-[10px] text-secondary mt-2">Week 3</span>
              </div>
              <div class="w-10 h-full flex flex-col justify-end items-center z-10">
                <div class="w-4 bg-primary rounded-t-sm" style={{ height: '70%' }}></div>
                <span class="text-[10px] text-secondary mt-2">Week 4</span>
              </div>
            </div>
          </div>

          {/* Top Performing Doctors */}
          <div class="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 class="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              Top Performing Doctors
            </h3>
            
            <table class="min-w-full divide-y divide-border-subtle text-left text-xs">
              <thead>
                <tr class="text-secondary font-semibold uppercase">
                  <th class="py-2">Physician</th>
                  <th class="py-2">Patients (Mo)</th>
                  <th class="py-2">AI Adoption Bar</th>
                  <th class="py-2">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                {deptDocs.map(doc => (
                  <tr key={doc.id} class="hover:bg-surface-container-low transition-colors">
                    <td class="py-3 font-bold text-on-surface">{doc.name}</td>
                    <td class="py-3 text-secondary font-semibold">{doc.ai_consults} patients</td>
                    <td class="py-3 w-1/3">
                      <div class="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                        <div class="bg-primary h-full rounded-full" style={{ width: doc.id === 'afe06dbf-28f1-43aa-9e1b-d096dd713a84' ? '92%' : '80%' }}></div>
                      </div>
                    </td>
                    <td class="py-3">
                      <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'approved' ? 'bg-primary-light text-primary' : 'bg-error-container text-error'
                      }`}>
                        {doc.status === 'approved' ? 'Optimal' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Alerts and Logs */}
        <div class="lg:col-span-4 space-y-6">
          {/* Action Required Expiring Alerts */}
          <div class="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 class="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3 text-error flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[20px]">warning</span>
              Action Required
            </h3>

            {expiringDoctors.length === 0 ? (
              <p class="text-xs text-secondary">All doctor licenses are healthy.</p>
            ) : (
              <div class="space-y-3">
                {expiringDoctors.map(doc => (
                  <div key={doc.id} class="p-3 bg-error-container/20 border border-error/10 rounded-lg space-y-2">
                    <div class="flex justify-between items-start">
                      <div>
                        <h4 class="text-xs font-bold text-on-surface">{doc.name}</h4>
                        <span class="text-[9px] text-error font-semibold">License expires in 14 days</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePage('org-subscriptions')}
                      class="w-full text-center py-1.5 bg-error hover:bg-error/90 text-white rounded text-[10px] font-bold transition-colors shadow-sm"
                    >
                      Renew License
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Activity Feed */}
          <div class="bg-white border border-border-subtle rounded-xl shadow-sm p-6 space-y-4">
            <h3 class="font-button text-sm text-on-surface font-bold border-b border-border-subtle pb-3">
              Department Activity
            </h3>
            
            <div class="space-y-4 text-xs">
              <div class="flex gap-2.5 items-start">
                <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                <div>
                  <p class="font-bold text-on-surface">Dr. Ahmed Hassan completed 15 consultations</p>
                  <span class="text-[9px] text-secondary">2 hours ago</span>
                </div>
              </div>
              <div class="flex gap-2.5 items-start">
                <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                <div>
                  <p class="font-bold text-on-surface">New structural cardiology report updated</p>
                  <span class="text-[9px] text-secondary">Yesterday, 02:30 PM</span>
                </div>
              </div>
              <div class="flex gap-2.5 items-start">
                <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                <div>
                  <p class="font-bold text-on-surface">Dr. Julian Vance joined Cardiology Dept</p>
                  <span class="text-[9px] text-secondary">Oct 10, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
