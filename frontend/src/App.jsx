import React, { useState } from 'react';
import QuizStart from './components/QuizStart';
import QuestionCard from './components/QuestionCard';
import Results from './components/Results';

const API = process.env.REACT_APP_API_URL;

export default function App() {
  const [screen, setScreen] = useState('start'); // 'start' | 'quiz' | 'results'
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: chosen_option }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function startQuiz() {
    setLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch(`${API}/api/session`, { method: 'POST' });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error);

      const sid = sessionData.session_id;

      const questionsRes = await fetch(`${API}/api/session/${sid}`);
      const questionsData = await questionsRes.json();
      if (!questionsRes.ok) throw new Error(questionsData.error);

      setSessionId(sid);
      setQuestions(questionsData.questions);
      setCurrentIndex(0);
      setAnswers({});
      setScreen('quiz');
    } catch (err) {
      setError(err.message || 'Failed to start quiz. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(questionId, chosenOption) {
    // Save locally immediately so UI can update
    setAnswers((prev) => ({ ...prev, [questionId]: chosenOption }));

    // Send to backend
    try {
      await fetch(`${API}/api/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
          chosen_option: chosenOption,
        }),
      });
    } catch (err) {
      console.error('Failed to save response:', err);
    }
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setScreen('results');
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function restartQuiz() {
    setScreen('start');
    setSessionId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
  }

  if (screen === 'start') {
    return <QuizStart onStart={startQuiz} loading={loading} error={error} />;
  }

  if (screen === 'quiz') {
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

  if (screen === 'results') {
    return (
      <Results
        sessionId={sessionId}
        answers={answers}
        questions={questions}
        onRestart={restartQuiz}
      />
    );
  }
}
