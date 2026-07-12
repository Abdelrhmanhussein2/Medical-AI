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
import Admin from './pages/Admin';

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
        setActivePage('admin');
      } else if (activePage === 'login' || activePage === 'register' || activePage === 'landing') {
        setActivePage('dashboard');
      }
    }
  }, [currentUser]);

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
        return <Appointments />;
      case 'visits':
        return <Visits />;
      case 'admin':
        return <Admin />;
      default:
        return <Landing setActivePage={setActivePage} />;
    }
  };

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
