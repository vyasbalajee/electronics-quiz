import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminDashboard from './components/AdminDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import StudentDashboard from './components/StudentDashboard';
import QuizPage from './components/QuizPage';
import ResultsPage from './components/ResultsPage';

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
  const navigate = useNavigate();
  return <LoginPage onSwitch={() => navigate('/register')} />;
}

function RegisterRoute() {
  const navigate = useNavigate();
  return <RegisterPage onSwitch={() => navigate('/login')} />;
}

// Admin dashboard with navigation to instructor panel & student view
function AdminRoute() {
  const navigate = useNavigate();
  return (
    <AdminDashboard
      onNavigate={(screen) => navigate(screen === 'instructor' ? '/instructor' : '/admin')}
      onStudentView={() => navigate('/quiz?preview=1')}
    />
  );
}

function InstructorRoute() {
  const navigate = useNavigate();
  return (
    <InstructorDashboard
      onNavigate={(screen) => navigate(screen === 'admin' ? '/admin' : '/instructor')}
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route path="/login" element={<PublicRoute><LoginRoute /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterRoute /></PublicRoute>} />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={['student']}><StudentRoute /></ProtectedRoute>
        } />
        <Route path="/instructor" element={
          <ProtectedRoute roles={['instructor', 'admin']}><InstructorRoute /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><AdminRoute /></ProtectedRoute>
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
    </BrowserRouter>
  );
}
