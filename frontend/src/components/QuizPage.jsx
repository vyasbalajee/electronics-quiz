import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuestionCard from './QuestionCard';

const API = process.env.REACT_APP_API_URL;

export default function QuizPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1' &&
    (user?.role === 'admin' || user?.role === 'instructor');

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const questionStartTime = useRef(null);
  const timings = useRef({});
  const startedRef = useRef(false);

  const startQuiz = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch(`${API}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preview: isPreview }),
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
        const answersRes = await fetch(`${API}/api/session/${sid}/answers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const answersData = await answersRes.json();
        const existingAnswers = answersData.answers || {};
        setAnswers(existingAnswers);
        const firstUnanswered = questionsData.questions.findIndex((q) => !existingAnswers[q.id]);
        setCurrentIndex(firstUnanswered === -1 ? questionsData.questions.length - 1 : firstUnanswered);
      } else {
        setAnswers({});
        setCurrentIndex(0);
      }

      questionStartTime.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, isPreview]);

  // Start the quiz once on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startQuiz();
  }, [startQuiz]);

  async function submitAnswer(questionId, chosenOption) {
    const now = Date.now();
    const elapsed = Math.round((now - questionStartTime.current) / 1000);
    timings.current[questionId] = elapsed;
    setAnswers((prev) => ({ ...prev, [questionId]: chosenOption }));

    try {
      await fetch(`${API}/api/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      questionStartTime.current = Date.now();
      setCurrentIndex((i) => i + 1);
    } else {
      // Finish — go to results, passing preview state
      navigate(`/results/${sessionId}${isPreview ? '?preview=1' : ''}`);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      questionStartTime.current = Date.now();
      setCurrentIndex((i) => i - 1);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#00d4aa', fontFamily: 'Share Tech Mono' }}>
        Loading quiz...
      </div>
    );
  }

  if (error) {
    return (
      <div className="start-wrapper">
        <div className="start-card">
          <div className="start-icon">⚠</div>
          <h1 className="start-title">Couldn't start quiz</h1>
          <div className="start-error">{error}</div>
          <button className="start-btn" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    );
  }

  if (!questions.length) return null;

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
      previewMode={isPreview}
    />
  );
}
