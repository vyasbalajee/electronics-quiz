import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminDashboard from './components/AdminDashboard';
import InstructorDashboard from './components/InstructorDashboard';
import StudentDashboard from './components/StudentDashboard';
import QuestionCard from './components/QuestionCard';
import Results from './components/Results';

const API = process.env.REACT_APP_API_URL;

export default function App() {
  const { user, token, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'register'
  const [quizScreen, setQuizScreen] = useState('dashboard'); // 'dashboard' | 'quiz' | 'results'
  const [dashScreen, setDashScreen] = useState(null); // 'admin' | 'instructor' (for admin who can switch)
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#00d4aa', fontFamily: 'Share Tech Mono' }}>
        Loading...
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (authScreen === 'login') return <LoginPage onSwitch={() => setAuthScreen('register')} />;
    return <RegisterPage onSwitch={() => setAuthScreen('login')} />;
  }

  // Determine which dashboard to show for admin
  function getEffectiveRole() {
    if (user.role === 'admin') return dashScreen || 'admin';
    return user.role;
  }

  const effectiveRole = getEffectiveRole();

  // Quiz flow
  async function startQuiz() {
    setQuizLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch(`${API}/api/session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error);

      const sid = sessionData.session_id;
      const questionsRes = await fetch(`${API}/api/session/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const questionsData = await questionsRes.json();
      if (!questionsRes.ok) throw new Error(questionsData.error);

      setSessionId(sid);
      setQuestions(questionsData.questions);
      setCurrentIndex(0);
      setAnswers({});
      setQuizScreen('quiz');
    } catch (err) {
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function submitAnswer(questionId, chosenOption) {
    setAnswers((prev) => ({ ...prev, [questionId]: chosenOption }));
    try {
      await fetch(`${API}/api/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, question_id: questionId, chosen_option: chosenOption }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  function goNext() {
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
    else setQuizScreen('results');
  }

  function goPrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  function backToDashboard() {
    setQuizScreen('dashboard');
    setSessionId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
  }

  // Quiz screens
  if (quizScreen === 'quiz') {
    const question = questions[currentIndex];
    return (
      <QuestionCard
        question={question}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        selectedOption={answers[question.id] || null}
        onSelectOption={(opt) => submitAnswer(question.id, opt)}
        onNext={goNext}
        onPrev={goPrev}
        isFirst={currentIndex === 0}
        isLast={currentIndex === questions.length - 1}
      />
    );
  }

  if (quizScreen === 'results') {
    return <Results sessionId={sessionId} onRestart={backToDashboard} />;
  }

  // Dashboards
  if (effectiveRole === 'admin') {
    return (
      <AdminDashboard
        onNavigate={(screen) => setDashScreen(screen)}
      />
    );
  }

  if (effectiveRole === 'instructor') {
    return (
      <InstructorDashboard
        onNavigate={(screen) => setDashScreen(screen === 'admin' ? null : screen)}
      />
    );
  }

  // Student
  return (
    <StudentDashboard
      onStartQuiz={startQuiz}
      quizLoading={quizLoading}
      error={error}
    />
  );
}
