import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import ProvisionUsers from './components/ProvisionUsers';
import AdminDashboard from './components/AdminDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import StudentDashboard from './components/StudentDashboard';
import QuizPage from './components/QuizPage';
import ResultsPage from './components/ResultsPage';
import MaintenanceDialog from './components/MaintenanceDialog';
import VersionBadge from './components/VersionBadge';
import WhatsNew from './components/WhatsNew';
import VersionNotes from './components/VersionNotes';

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#00d4aa', fontFamily: 'Share Tech Mono' }}>
      Loading...
    </div>
  );
}

// Redirects logged-in users to their role's home
function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'instructor') return '/instructor';
  return '/dashboard';
}

// Wrapper: requires auth, optionally restricts to roles
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return children;
}

// Public auth routes — redirect away if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

// Login wrapper to inject navigation on success
function LoginRoute() {
  return <LoginPage />;
}

// Provisioning page (instructor/admin) — create accounts by name + email
function ProvisionRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return <ProvisionUsers onBack={() => navigate(user?.role === 'admin' ? '/admin' : '/instructor')} />;
}

// Admin dashboard with navigation to instructor panel & student view
function AdminRoute() {
  const navigate = useNavigate();
  return (
    <AdminDashboard
      onNavigate={(screen) => navigate(screen === 'instructor' ? '/instructor' : screen === 'provision' ? '/provision' : '/admin')}
      onStudentView={() => navigate('/quiz?preview=1')}
    />
  );
}

function InstructorRoute() {
  const navigate = useNavigate();
  return (
    <InstructorDashboard
      onNavigate={(screen) => navigate(screen === 'admin' ? '/admin' : screen === 'provision' ? '/provision' : '/instructor')}
      onStudentView={() => navigate('/quiz?preview=1')}
    />
  );
}

function StudentRoute() {
  const navigate = useNavigate();
  return <StudentDashboard onStartQuiz={() => navigate('/quiz')} />;
}

// Root redirect based on auth state
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

// Gate: during maintenance, non-exempt users see the dialog — unless they're
// mid-quiz, in which case the app stays rendered so they can finish.
function MaintenanceGate({ children }) {
  const { maintenance, user, loading, quizInProgress } = useAuth();
  const [showStaffLogin, setShowStaffLogin] = useState(false);

  if (loading) return <LoadingScreen />;

  const exempt = user && (user.role === 'admin' || user.is_test_account === true);

  if (maintenance && !exempt && !quizInProgress) {
    if (showStaffLogin) {
      return <LoginPage onSwitch={() => setShowStaffLogin(false)} />;
    }
    return <MaintenanceDialog onStaffLogin={() => setShowStaffLogin(true)} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <VersionBadge />
      <VersionNotes />
      <WhatsNew />
      <MaintenanceGate>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/login" element={<PublicRoute><LoginRoute /></PublicRoute>} />

          <Route path="/dashboard" element={
            <ProtectedRoute roles={['student']}><StudentRoute /></ProtectedRoute>
          } />
          <Route path="/instructor" element={
            <ProtectedRoute roles={['instructor', 'admin']}><InstructorRoute /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}><AdminRoute /></ProtectedRoute>
          } />
          <Route path="/provision" element={
            <ProtectedRoute roles={['instructor', 'admin']}><ProvisionRoute /></ProtectedRoute>
          } />

          <Route path="/quiz" element={
            <ProtectedRoute><QuizPage /></ProtectedRoute>
          } />
          <Route path="/results/:sessionId" element={
            <ProtectedRoute><ResultsPage /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </MaintenanceGate>
    </BrowserRouter>
  );
}
