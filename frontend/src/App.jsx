import React, { useState, useRef } from 'react';
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
  const [authScreen, setAuthScreen] = useState('login');
  const [quizScreen, setQuizScreen] = useState('dashboard');
  const [dashScreen, setDashScreen] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Timer tracking
  const questionStartTime = useRef(null);
  const timings = useRef({}); // { question_id: seconds }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#00d4aa', fontFamily: 'Share Tech Mono' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'login') return <LoginPage onSwitch={() => setAuthScreen('register')} />;
    return <RegisterPage onSwitch={() => setAuthScreen('login')} />;
  }

  function getEffectiveRole() {
    if (user.role === 'admin') return dashScreen || 'admin';
    return user.role;
  }

  const effectiveRole = getEffectiveRole();

  async function startQuiz(preview = false) {
    setQuizLoading(true);
    setError(null);
    setPreviewMode(preview);
    try {
      const sessionRes = await fetch(`${API}/api/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preview }),
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
      timings.current = {};

      if (sessionData.resumed) {
        // Fetch existing answers to resume where the student left off
        const answersRes = await fetch(`${API}/api/session/${sid}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const answersData = await answersRes.json();
        const existingAnswers = answersData.answers || {};
        setAnswers(existingAnswers);

        // Resume at the first unanswered question
        const firstUnanswered = questionsData.questions.findIndex(
          (q) => !existingAnswers[q.id]
        );
        setCurrentIndex(firstUnanswered === -1 ? questionsData.questions.length - 1 : firstUnanswered);
      } else {
        setAnswers({});
        setCurrentIndex(0);
      }

      questionStartTime.current = Date.now();
      setQuizScreen('quiz');
    } catch (err) {
      setError(err.message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function submitAnswer(questionId, chosenOption) {
    // Calculate time taken for this question
    const now = Date.now();
    const elapsed = Math.round((now - questionStartTime.current) / 1000);
    timings.current[questionId] = elapsed;

    setAnswers((prev) => ({ ...prev, [questionId]: chosenOption }));

    try {
      await fetch(`${API}/api/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          chosen_option: chosenOption,
          time_taken_seconds: elapsed,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      // Reset timer for next question
      questionStartTime.current = Date.now();
      setCurrentIndex((i) => i + 1);
    } else {
      setQuizScreen('results');
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      // Reset timer when going back
      questionStartTime.current = Date.now();
      setCurrentIndex((i) => i - 1);
    }
  }

  function backToDashboard() {
    setQuizScreen('dashboard');
    setSessionId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    timings.current = {};
    setPreviewMode(false);
  }

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
        startTime={questionStartTime}
        previewMode={previewMode}
      />
    );
  }

  if (quizScreen === 'results') {
    return <Results sessionId={sessionId} onRestart={backToDashboard} previewMode={previewMode} />;
  }

  if (effectiveRole === 'admin') {
    return (
      <AdminDashboard
        onNavigate={(screen) => setDashScreen(screen)}
        onStudentView={() => startQuiz(true)}
      />
    );
  }

  if (effectiveRole === 'instructor') {
    return (
      <InstructorDashboard
        onNavigate={(screen) => setDashScreen(screen === 'admin' ? null : screen)}
        onStudentView={() => startQuiz(true)}
      />
    );
  }

  return (
    <StudentDashboard
      onStartQuiz={startQuiz}
      quizLoading={quizLoading}
      error={error}
    />
  );
}
