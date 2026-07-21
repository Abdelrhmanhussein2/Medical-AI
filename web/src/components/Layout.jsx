import React from 'react';
import { useApp } from '../context/AppContext';
import SbrLogo from './SbrLogo';

export default function Layout({ children, activePage, setActivePage }) {
  const { currentUser, logout } = useApp();

  if (!currentUser) return <>{children}</>;

  const isLiveSession = activePage && activePage.startsWith('live-session');
  if (isLiveSession) return <>{children}</>;

  let suiteSub = "";
  let menuItems = [];

  if (currentUser.role === 'admin') {
    suiteSub = "ADMIN SUITE";
    menuItems = [
      { id: 'admin-overview', name: 'Organization Overview', icon: 'grid_view' },
      { id: 'admin-users', name: 'Department Management', icon: 'corporate_fare' },
      { id: 'admin-subscriptions', name: 'Subscription Health', icon: 'credit_card' },
      { id: 'admin-aichat', name: 'SBR AI Chat', icon: 'smart_toy' }
    ];
  } else if (currentUser.role === 'org') {
    suiteSub = "ORG SUITE";
    menuItems = [
      { id: 'org-dashboard', name: 'Dashboard', icon: 'dashboard' },
      { id: 'org-doctors', name: 'Doctors Roster', icon: 'medical_information' },
      { id: 'org-analytics', name: 'Clinical Analytics', icon: 'analytics' },
      { id: 'org-subscriptions', name: 'Subscription Health', icon: 'credit_card' }
    ];
  } else {
    menuItems = [
      { id: 'dashboard', name: 'Dashboard', icon: 'dashboard' },
      { id: 'patients', name: 'Patients', icon: 'group' },
      { id: 'appointments', name: 'Appointments', icon: 'calendar_month' },
      { id: 'visits', name: 'Medical Visits', icon: 'medical_information' },
      { id: 'aichat', name: 'SBR AI Chat', icon: 'smart_toy' },
      { id: 'subscription', name: 'My Subscription', icon: 'card_membership' }
    ];
  }

  return (
    <div class="min-h-screen flex bg-bg-canvas text-on-background">
      {/* SideNavBar */}
      <nav class="hidden md:flex bg-bg-canvas text-primary font-body-sm h-screen w-64 fixed left-0 top-0 border-r border-border-subtle flex flex-col py-stack-lg z-40">
        <div class="px-stack-md mb-stack-lg">
          <div class="px-stack-md block mb-4">
            <SbrLogo size={36} color="#24564C" showText={true} textClass="text-primary" />
            {suiteSub && (
              <span class="text-[9px] font-black text-secondary tracking-widest block uppercase mt-1.5 ml-1">{suiteSub}</span>
            )}
          </div>

          <div class="flex items-center gap-stack-sm px-stack-md mb-6">
            <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold border border-border-subtle shadow-sm uppercase">
              {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('') : 'U'}
            </div>
            <div>
              <p class="font-button text-button text-on-surface text-sm font-bold truncate max-w-[140px]">{currentUser.name}</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs truncate max-w-[140px]">
                {currentUser.role === 'admin'
                  ? 'Super Admin'
                  : currentUser.role === 'org'
                    ? (currentUser.specialty || 'Organization')
                    : (currentUser.department || 'Doctor')
                }
              </p>
            </div>
          </div>
        </div>

        <ul class="px-stack-sm space-y-1">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActivePage(item.id)}
                class={`w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer rounded-lg transition-colors text-left ${activePage === item.id
                    ? 'bg-primary-light text-primary font-bold shadow-sm'
                    : 'text-secondary hover:bg-surface-container'
                  }`}
              >
                <span class="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span class="text-xs font-semibold">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Dynamic Role Action Buttons */}
        {currentUser.role === 'admin' && (
          <div class="px-4 my-4">
            <button
              onClick={() => setActivePage('admin-users')}
              class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary-hover shadow-sm transition-colors"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              Add New Department
            </button>
          </div>
        )}

        {currentUser.role === 'org' && (
          <div class="px-4 my-4">
            <button
              onClick={() => setActivePage('org-doctors')}
              class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary text-on-primary text-xs font-bold rounded-lg hover:bg-primary-hover shadow-sm transition-colors"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              Add New Doctor
            </button>
          </div>
        )}

        <ul class="px-stack-sm mt-auto space-y-1">
          <li>
            <button
              onClick={logout}
              class="w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer text-secondary hover:bg-surface-container rounded-lg transition-colors text-left"
            >
              <span class="material-symbols-outlined text-[20px]">logout</span>
              <span class="text-xs font-semibold">Sign Out</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div class={`flex-1 md:ml-64 bg-bg-canvas min-h-screen ${(activePage === 'aichat' || activePage === 'admin-aichat') ? 'p-0' : 'p-margin-desktop'
        }`}>
        {children}
      </div>
    </div>
  );
}

