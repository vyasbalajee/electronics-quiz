import React from 'react';
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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === '1';

  return (
    <Results
      sessionId={sessionId}
      previewMode={previewMode}
      onRestart={() => navigate(roleHome(user.role))}
    />
  );
}
