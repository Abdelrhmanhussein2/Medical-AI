import React from 'react';
import { useApp } from '../context/AppContext';

export default function Layout({ children, activePage, setActivePage }) {
  const { currentUser, logout } = useApp();

  if (!currentUser) return <>{children}</>;

  const menuItems = currentUser.role === 'admin' ? [
    { id: 'admin', name: 'Admin Control', icon: 'admin_panel_settings' }
  ] : [
    { id: 'dashboard', name: 'Dashboard', icon: 'dashboard' },
    { id: 'patients', name: 'Patients', icon: 'group' },
    { id: 'appointments', name: 'Appointments', icon: 'calendar_month' },
    { id: 'visits', name: 'Medical Visits', icon: 'medical_information' }
  ];

  return (
    <div class="min-h-screen flex bg-bg-canvas text-on-background">
      {/* SideNavBar */}
      <nav class="hidden md:flex bg-bg-canvas text-primary font-body-sm h-screen w-64 fixed left-0 top-0 border-r border-border-subtle flex flex-col py-stack-lg z-40">
        <div class="px-stack-md mb-stack-lg">
          <span class="font-headline-md text-headline-md font-bold text-primary px-stack-md block mb-stack-lg">MedAI Core</span>
          
          <div class="flex items-center gap-stack-sm px-stack-md mb-stack-lg">
            <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold border border-border-subtle shadow-sm">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p class="font-button text-button text-on-surface text-sm">{currentUser.name}</p>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">{currentUser.role === 'admin' ? 'Administrator' : (currentUser.specialization || 'Doctor')}</p>
            </div>
          </div>
        </div>

        <ul class="flex-1 px-stack-sm space-y-1">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActivePage(item.id)}
                class={`w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer rounded-lg transition-colors text-left ${
                  activePage === item.id 
                    ? 'bg-primary-light text-primary font-bold' 
                    : 'text-secondary hover:bg-surface-container'
                }`}
              >
                <span class="material-symbols-outlined">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>

        <ul class="px-stack-sm mt-auto space-y-1">
          <li>
            <button 
              onClick={logout}
              class="w-full flex items-center gap-stack-md px-stack-md py-stack-sm cursor-pointer text-secondary hover:bg-surface-container rounded-lg transition-colors text-left"
            >
              <span class="material-symbols-outlined">logout</span>
              <span>Sign Out</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div class="flex-1 md:ml-64 p-margin-desktop bg-bg-canvas min-h-screen">
        {children}
      </div>
    </div>
  );
}
