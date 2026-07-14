import React from 'react';
import { useApp } from '../context/AppContext';

export default function Dashboard({ setActivePage }) {
  const { currentUser, appointments, patients } = useApp();

  // Get only today's appointments for Julian Vance (current user)
  const myAppts = appointments.filter(a => a.doctor_id === currentUser.id);

  // Map patients to appointments for displaying
  const upcomingPatients = myAppts.map(appt => {
    const patientObj = patients.find(p => p.id === appt.patient_id);
    return {
      ...appt,
      patientName: patientObj ? patientObj.name : 'Unknown Patient',
      initials: patientObj ? patientObj.name.split(' ').map(n => n[0]).join('') : 'UN'
    };
  });

  return (
    <div>
      {/* Header */}
      <header class="flex justify-between items-end mb-stack-lg border-b border-border-subtle pb-stack-md">
        <div>
          <h1 class="font-display-lg text-headline-lg text-on-surface font-bold">Dashboard</h1>
          <p class="font-body-lg text-body-lg text-on-surface-variant mt-1">Overview of today's clinical activities and clinical insights.</p>
        </div>
        <div class="flex items-center gap-stack-md">
          <button 
            onClick={() => setActivePage('appointments')}
            class="bg-primary hover:bg-primary-hover text-on-primary font-button text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">add</span>
            New Appointment
          </button>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Quick Stats Row */}
        <div class="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-md">
          {/* Stat Card 1 */}
          <div class="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <p class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">Today's Appts</p>
              <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg">calendar_today</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 class="font-headline-lg text-headline-lg text-on-surface font-bold">{myAppts.length}</h3>
              <span class="font-body-sm text-xs text-tertiary-container flex items-center">
                <span class="material-symbols-outlined text-[16px] mr-1">trending_up</span> Active
              </span>
            </div>
          </div>

          {/* Stat Card 2 */}
          <div class="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <p class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">Pending Reports</p>
              <span class="material-symbols-outlined text-status-warning bg-surface-container-high p-2 rounded-lg">description</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 class="font-headline-lg text-headline-lg text-on-surface font-bold">2</h3>
              <span class="font-body-sm text-xs text-on-surface-variant">Requires review</span>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div class="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <p class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">Clinical Accuracy</p>
              <span class="material-symbols-outlined text-tertiary bg-tertiary-fixed p-2 rounded-lg">verified_user</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 class="font-headline-lg text-headline-lg text-on-surface font-bold">98.4%</h3>
              <span class="font-body-sm text-xs text-tertiary-container flex items-center">
                <span class="material-symbols-outlined text-[16px] mr-1">trending_up</span> +0.5%
              </span>
            </div>
          </div>

          {/* Stat Card 4 */}
          <div class="bg-bg-card rounded-xl border border-border-subtle p-6 shadow-sm hover:shadow-ambient transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <p class="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider">Est. Revenue</p>
              <span class="material-symbols-outlined text-primary bg-primary-light p-2 rounded-lg">payments</span>
            </div>
            <div class="flex items-baseline gap-2">
              <h3 class="font-headline-lg text-headline-lg text-on-surface font-bold">$1.8k</h3>
              <span class="font-body-sm text-xs text-on-surface-variant">Today</span>
            </div>
          </div>
        </div>

        {/* Left Column: Upcoming Patients */}
        <div class="col-span-12 md:col-span-7 space-y-gutter">
          <div class="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div class="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <h2 class="font-headline-md text-headline-md text-on-surface font-bold">Upcoming Patients</h2>
              <button 
                onClick={() => setActivePage('patients')}
                class="text-primary hover:text-primary-hover font-button text-sm transition-colors"
              >
                View All
              </button>
            </div>
            <div class="space-y-4">
              {upcomingPatients.length === 0 ? (
                <p class="text-secondary text-sm py-4 text-center">لا توجد مواعيد مجدولة لليوم</p>
              ) : (
                upcomingPatients.map((patient, idx) => (
                  <div 
                    key={patient.id} 
                    onClick={() => setActivePage('visits')}
                    class="flex items-center justify-between p-4 hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-border-subtle group cursor-pointer"
                  >
                    <div class="flex items-center gap-4">
                      <div class={`w-12 h-12 rounded-full flex items-center justify-center font-button text-sm ${
                        patient.is_high_priority 
                          ? 'bg-error-container text-error' 
                          : 'bg-primary-light text-primary'
                      }`}>
                        {patient.initials}
                      </div>
                      <div>
                        <h4 class="font-button text-sm text-on-surface group-hover:text-primary transition-colors font-semibold">
                          {patient.patientName}
                        </h4>
                        <p class="font-body-sm text-xs text-on-surface-variant">
                          {patient.appointment_time} • {patient.description} • Room {idx + 1}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      {patient.is_high_priority && (
                        <span class="px-3 py-1 bg-error-container text-error font-label-caps text-[10px] rounded-full flex items-center gap-1">
                          <span class="material-symbols-outlined text-[12px]">priority_high</span> High Priority
                        </span>
                      )}
                      <span class={`px-3 py-1 font-label-caps text-[10px] rounded-full flex items-center gap-1 ${
                        patient.status === 'confirmed' 
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          : 'bg-surface-container-high text-secondary'
                      }`}>
                        {patient.status.toUpperCase()}
                      </span>
                      <button class="p-2 text-secondary group-hover:text-primary transition-colors">
                        <span class="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant (LIGHT MODE ONLY) & Activity */}
        <div class="col-span-12 md:col-span-5 space-y-gutter">
          
          {/* AI Assistant Card - Swapped to a premium light teal/mint styled container */}
          <div class="bg-primary-light border-2 border-primary/20 rounded-xl p-stack-lg shadow-sm relative overflow-hidden">
            <div class="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
            <div class="flex items-start gap-4 relative z-10">
              <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span class="material-symbols-outlined fill">psychology</span>
              </div>
              <div>
                <h3 class="font-headline-md text-base text-primary font-bold mb-2">SBR AI Assistant</h3>
                <p class="font-body-sm text-sm text-secondary mb-4 leading-relaxed">
                  I've analyzed the lab results for Marcus Johnson (11:15 AM). There are slight anomalies in the hepatic panel that might warrant further discussion.
                </p>
                <div class="flex gap-3">
                  <button 
                    onClick={() => setActivePage('visits')}
                    class="bg-primary hover:bg-primary-hover text-on-primary font-button text-xs py-1.5 px-4 rounded-full transition-colors border border-primary shadow-sm"
                  >
                    View Analysis
                  </button>
                  <button class="bg-white hover:bg-surface-container-low text-secondary font-button text-xs py-1.5 px-4 rounded-full transition-colors border border-border-subtle shadow-sm">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div class="bg-bg-card rounded-xl border border-border-subtle p-stack-lg shadow-sm">
            <div class="flex justify-between items-center mb-stack-md pb-stack-sm border-b border-border-subtle">
              <h2 class="font-button text-sm text-on-surface font-bold">Recent Activity</h2>
            </div>
            <div class="relative border-l border-border-subtle ml-3 space-y-6">
              <div class="relative pl-6">
                <div class="absolute w-3 h-3 bg-primary rounded-full -left-[6.5px] top-1 ring-4 ring-bg-card"></div>
                <p class="font-body-sm text-xs text-on-surface"><span class="font-semibold">{currentUser.name}</span> signed Patient Report #8821</p>
                <p class="font-label-caps text-[10px] text-on-surface-variant mt-1">10 mins ago</p>
              </div>
              <div class="relative pl-6">
                <div class="absolute w-3 h-3 bg-surface-container-high border-2 border-border-subtle rounded-full -left-[6.5px] top-1 ring-4 ring-bg-card"></div>
                <p class="font-body-sm text-xs text-on-surface"><span class="font-semibold">System</span> generated clinical notes for Eleanor Sullivan.</p>
                <p class="font-label-caps text-[10px] text-on-surface-variant mt-1">45 mins ago</p>
              </div>
              <div class="relative pl-6">
                <div class="absolute w-3 h-3 bg-surface-container-high border-2 border-border-subtle rounded-full -left-[6.5px] top-1 ring-4 ring-bg-card"></div>
                <p class="font-body-sm text-xs text-on-surface"><span class="font-semibold">Lab</span> uploaded new results for Marcus Johnson.</p>
                <p class="font-label-caps text-[10px] text-on-surface-variant mt-1">2 hours ago</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
