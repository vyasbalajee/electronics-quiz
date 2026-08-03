import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Results from './Results';

function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'instructor') return '/instructor';
  return '/dashboard';
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, enterQuizFlow, exitQuizFlow } = useAuth();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === '1';

  // Keep the quiz flow "active" while results are on screen, so a maintenance
  // logout waits until the student leaves this page.
  useEffect(() => {
    enterQuizFlow();
    return () => exitQuizFlow();
  }, []);

  return (
    <Results
      sessionId={sessionId}
      previewMode={previewMode}
      onRestart={() => navigate(roleHome(user.role))}
    />
  );
}
