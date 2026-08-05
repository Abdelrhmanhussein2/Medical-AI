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
import ForgotPassword from './pages/ForgotPassword';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import RefundPolicyPage from './pages/RefundPolicyPage';

// Admin pages (Code-Split using React.lazy)
const AdminOverview = React.lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminSubscriptions = React.lazy(() => import('./pages/admin/AdminSubscriptions'));

// Org pages (Code-Split using React.lazy)
const OrgDashboard = React.lazy(() => import('./pages/org/OrgDashboard'));
const OrgDoctors = React.lazy(() => import('./pages/org/OrgDoctors'));
const OrgAnalytics = React.lazy(() => import('./pages/org/OrgAnalytics'));
const OrgSubscriptions = React.lazy(() => import('./pages/org/OrgSubscriptions'));

import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

function ProtectedRoute({ children, role }) {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to={role === 'admin' ? '/portal-9x4m' : '/login'} replace />;
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

function VisitsRouteWrapper() {
  const { patientId } = useParams();
  return <Visits initialPatientId={patientId} />;
}

function AiChatThreadRouteWrapper() {
  const { threadId } = useParams();
  return <AiChat initialThreadId={threadId} />;
}

function AppContent() {
  const { currentUser, sessionLoading } = useApp();
  const { dir } = useLanguage();
  const navigate = useNavigate();

  // Show global spinner while verifying session — prevents white screen
  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafb' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e0e0e0', borderTop: '3px solid #24564C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const handleNavigation = (page) => {
    if (page.startsWith('aichat-patient-')) {
      const id = page.replace('aichat-patient-', '');
      navigate(`/aichat-patient/${id}`);
    } else if (page.startsWith('aichat-thread-')) {
      const id = page.replace('aichat-thread-', '');
      navigate(`/aichat-thread/${id}`);
    } else if (page.startsWith('visits-patient-')) {
      const id = page.replace('visits-patient-', '');
      navigate(`/visits-patient/${id}`);
    } else if (page.startsWith('live-session-')) {
      const id = page.replace('live-session-', '');
      navigate(`/live-session/${id}`);
    } else {
      navigate(page.startsWith('/') ? page : `/${page}`);
    }
  };

  return (
    <div dir={dir} className="min-h-screen bg-bg-canvas text-on-background">
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-bg-canvas text-primary">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      }>
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
          
          <Route path="/portal-9x4m" element={
            currentUser ? (
              currentUser.role === 'admin' ? <Navigate to="/admin-overview" replace /> :
              currentUser.role === 'org' ? <Navigate to="/org-dashboard" replace /> :
              <Navigate to="/dashboard" replace />
            ) : (
              <Login setActivePage={handleNavigation} isPortal={true} />
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

          <Route path="/forgot-password" element={
            currentUser ? (
              currentUser.role === 'admin' ? <Navigate to="/admin-overview" replace /> :
              currentUser.role === 'org' ? <Navigate to="/org-dashboard" replace /> :
              <Navigate to="/dashboard" replace />
            ) : (
              <ForgotPassword setActivePage={handleNavigation} />
            )
          } />

          <Route path="/checkout" element={<Checkout />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />

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
          <Route path="/visits-patient/:patientId" element={
            <ProtectedRoute role="doctor">
              <LayoutWrapper activePage="visits" handleNavigation={handleNavigation}>
                <VisitsRouteWrapper />
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
          <Route path="/aichat-thread/:threadId" element={
            <ProtectedRoute role="doctor">
              <LayoutWrapper activePage="aichat" handleNavigation={handleNavigation}>
                <AiChatThreadRouteWrapper />
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
                <AdminOverview />
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

          {/* Org / Department routes */}
          <Route path="/org-dashboard" element={
            <ProtectedRoute role="org">
              <LayoutWrapper activePage="org-dashboard" handleNavigation={handleNavigation}>
                <OrgDashboard />
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
      </React.Suspense>
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

