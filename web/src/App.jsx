import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Visits from './pages/Visits';
import DoctorSubscription from './pages/DoctorSubscription';
import LiveSession from './pages/LiveSession';
import AiChat from './pages/AiChat';

// Admin pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

// Org pages
import OrgDashboard from './pages/org/OrgDashboard';
import OrgDoctors from './pages/org/OrgDoctors';
import OrgAnalytics from './pages/org/OrgAnalytics';
import OrgSubscriptions from './pages/org/OrgSubscriptions';

function AppContent() {
  const { currentUser } = useApp();
  const [activePage, setActivePage] = useState('landing');

  // Handle auto-routing when user logs in or out
  React.useEffect(() => {
    if (!currentUser) {
      if (activePage !== 'register' && activePage !== 'login') {
        setActivePage('landing');
      }
    } else {
      if (currentUser.role === 'admin') {
        if (!activePage.startsWith('admin-')) {
          setActivePage('admin-overview');
        }
      } else if (currentUser.role === 'org') {
        if (!activePage.startsWith('org-')) {
          setActivePage('org-dashboard');
        }
      } else {
        if (activePage === 'login' || activePage === 'register' || activePage === 'landing' || activePage.startsWith('admin-') || activePage.startsWith('org-')) {
          setActivePage('dashboard');
        }
      }
    }
  }, [currentUser, activePage]);

  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <Landing setActivePage={setActivePage} />;
      case 'login':
        return <Login setActivePage={setActivePage} />;
      case 'register':
        return <Register setActivePage={setActivePage} />;
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'patients':
        return <Patients />;
      case 'appointments':
        return <Appointments setActivePage={setActivePage} />;
      case 'visits':
        return <Visits />;
      case 'subscription':
        return <DoctorSubscription />;
      case 'aichat':
      case 'admin-aichat':
        return <AiChat />;
      
      // Admin
      case 'admin-overview':
        return <AdminOverview setActivePage={setActivePage} />;
      case 'admin-users':
        return <AdminUsers />;
      case 'admin-subscriptions':
        return <AdminSubscriptions />;
      
      // Org
      case 'org-dashboard':
        return <OrgDashboard setActivePage={setActivePage} />;
      case 'org-doctors':
        return <OrgDoctors />;
      case 'org-analytics':
        return <OrgAnalytics />;
      case 'org-subscriptions':
        return <OrgSubscriptions />;

      default:
        if (activePage.startsWith('live-session-')) {
          const appointmentId = activePage.split('live-session-')[1];
          return <LiveSession appointmentId={appointmentId} setActivePage={setActivePage} />;
        }
        return <Landing setActivePage={setActivePage} />;
    }
  };

  // Render LiveSession outside Layout for full-screen
  if (activePage && activePage.startsWith('live-session-')) {
    const appointmentId = activePage.split('live-session-')[1];
    return <LiveSession appointmentId={appointmentId} setActivePage={setActivePage} />;
  }

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

