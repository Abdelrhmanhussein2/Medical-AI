import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { SessionProvider } from './context/SessionContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
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
import Checkout from './pages/Checkout';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import ForceChangePassword from './pages/ForceChangePassword';

// Admin pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';

// Org pages
import OrgDashboard from './pages/org/OrgDashboard';
import OrgDoctors from './pages/org/OrgDoctors';
import OrgAnalytics from './pages/org/OrgAnalytics';
import OrgSubscriptions from './pages/org/OrgSubscriptions';

import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

function ProtectedRoute({ children, role }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Force password change on first-time login
  if (currentUser.must_change_password && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (role && currentUser.role !== role) {
    if (currentUser.role === 'admin') return <Navigate to="/admin-overview" replace />;
    if (currentUser.role === 'org') return <Navigate to="/org-dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LayoutWrapper({ children, activePage, handleNavigation }) {
  return (
    <Layout activePage={activePage} setActivePage={handleNavigation}>
      {children}
    </Layout>
  );
}

function LiveSessionRouteWrapper() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  return <LiveSession appointmentId={appointmentId} setActivePage={(page) => navigate(`/${page}`)} />;
}

function AiChatRouteWrapper() {
  const { patientId } = useParams();
  return <AiChat initialPatientId={patientId} />;
}

function AppContent() {
  const { currentUser } = useApp();
  const { dir } = useLanguage();
  const navigate = useNavigate();

  const handleNavigation = (page) => {
    if (page.startsWith('aichat-patient-')) {
      const id = page.replace('aichat-patient-', '');
      navigate(`/aichat-patient/${id}`);
    } else if (page.startsWith('live-session-')) {
      const id = page.replace('live-session-', '');
      navigate(`/live-session/${id}`);
    } else {
      navigate(page.startsWith('/') ? page : `/${page}`);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-bg-canvas text-on-background">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          currentUser ? (
            currentUser.role === 'admin' ? <Navigate to="/admin-overview" replace /> :
            currentUser.role === 'org' ? <Navigate to="/org-dashboard" replace /> :
            <Navigate to="/dashboard" replace />
          ) : (
            <Landing setActivePage={handleNavigation} />
          )
        } />
        
        <Route path="/login" element={
          currentUser ? (
            currentUser.role === 'admin' ? <Navigate to="/admin-overview" replace /> :
            currentUser.role === 'org' ? <Navigate to="/org-dashboard" replace /> :
            <Navigate to="/dashboard" replace />
          ) : (
            <Login setActivePage={handleNavigation} />
          )
        } />
        
        <Route path="/register" element={
          currentUser ? (
            currentUser.role === 'admin' ? <Navigate to="/admin-overview" replace /> :
            currentUser.role === 'org' ? <Navigate to="/org-dashboard" replace /> :
            <Navigate to="/dashboard" replace />
          ) : (
            <Register setActivePage={handleNavigation} />
          )
        } />

        <Route path="/checkout" element={<Checkout />} />

        <Route path="/change-password" element={
          <ProtectedRoute>
            <ForceChangePassword setActivePage={handleNavigation} />
          </ProtectedRoute>
        } />

        {/* Private layout-wrapped routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="dashboard" handleNavigation={handleNavigation}>
              <Dashboard setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/patients" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="patients" handleNavigation={handleNavigation}>
              <Patients setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/appointments" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="appointments" handleNavigation={handleNavigation}>
              <Appointments setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/visits" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="visits" handleNavigation={handleNavigation}>
              <Visits />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/templates" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="templates" handleNavigation={handleNavigation}>
              <Templates />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="subscription" handleNavigation={handleNavigation}>
              <DoctorSubscription />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/aichat" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="aichat" handleNavigation={handleNavigation}>
              <AiChat />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/aichat-patient/:patientId" element={
          <ProtectedRoute role="doctor">
            <LayoutWrapper activePage="aichat" handleNavigation={handleNavigation}>
              <AiChatRouteWrapper />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <LayoutWrapper activePage="settings" handleNavigation={handleNavigation}>
              <Settings setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin-overview" element={
          <ProtectedRoute role="admin">
            <LayoutWrapper activePage="admin-overview" handleNavigation={handleNavigation}>
              <AdminOverview setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/admin-users" element={
          <ProtectedRoute role="admin">
            <LayoutWrapper activePage="admin-users" handleNavigation={handleNavigation}>
              <AdminUsers />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/admin-subscriptions" element={
          <ProtectedRoute role="admin">
            <LayoutWrapper activePage="admin-subscriptions" handleNavigation={handleNavigation}>
              <AdminSubscriptions />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/admin-aichat" element={
          <ProtectedRoute role="admin">
            <LayoutWrapper activePage="admin-aichat" handleNavigation={handleNavigation}>
              <AiChat />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        {/* Org routes */}
        <Route path="/org-dashboard" element={
          <ProtectedRoute role="org">
            <LayoutWrapper activePage="org-dashboard" handleNavigation={handleNavigation}>
              <OrgDashboard setActivePage={handleNavigation} />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/org-doctors" element={
          <ProtectedRoute role="org">
            <LayoutWrapper activePage="org-doctors" handleNavigation={handleNavigation}>
              <OrgDoctors />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/org-analytics" element={
          <ProtectedRoute role="org">
            <LayoutWrapper activePage="org-analytics" handleNavigation={handleNavigation}>
              <OrgAnalytics />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        <Route path="/org-subscriptions" element={
          <ProtectedRoute role="org">
            <LayoutWrapper activePage="org-subscriptions" handleNavigation={handleNavigation}>
              <OrgSubscriptions />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        {/* Full screen routes */}
        <Route path="/live-session/:appointmentId" element={
          <ProtectedRoute role="doctor"><LiveSessionRouteWrapper /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <LanguageProvider>
          <SessionProvider>
            <AppContent />
          </SessionProvider>
        </LanguageProvider>
      </AppProvider>
    </Router>
  );
}

