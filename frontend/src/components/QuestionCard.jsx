import React, { useState, useEffect, useRef } from 'react';
import ImageModal from './ImageModal';
import './QuestionCard.css';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  onSelectOption,
  onNext,
  onPrev,
  isFirst,
  isLast,
  startTime,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const progress = (questionNumber / totalQuestions) * 100;

  const hasLimit = question.time_limit_seconds && question.time_limit_seconds > 0;
  const limit = question.time_limit_seconds || 0;

  // Ref to always have latest onNext for the auto-advance timeout
  const onNextRef = useRef(onNext);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);

  // Timer — counts up internally always; we derive countdown from elapsed
  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => {
      if (startTime?.current) {
        const secs = Math.round((Date.now() - startTime.current) / 1000);
        setElapsed(secs);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [question.id]);

  // Auto-advance when countdown reaches zero
  useEffect(() => {
    if (hasLimit && elapsed >= limit) {
      // Move to next question, keeping whatever is selected (or unanswered)
      onNextRef.current();
    }
  }, [elapsed, hasLimit, limit]);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const remaining = hasLimit ? Math.max(0, limit - elapsed) : 0;

  return (
    <div className="quiz-wrapper">
      <div className="quiz-card">
        {/* Header */}
        <div className="quiz-header">
          <div className="quiz-header-top">
            <span className="quiz-counter">
              Question <strong>{questionNumber}</strong> / {totalQuestions}
            </span>
            <span className="quiz-limit-label">
              Timer: {hasLimit ? `${limit}s` : '-'}
            </span>
          </div>
          <div className="quiz-header-timer">
            {hasLimit ? (
              <span className={`quiz-timer countdown ${remaining <= 5 ? 'urgent' : ''}`}>
                ⏱ {formatTime(remaining)}
              </span>
            ) : (
              <span className="quiz-timer">⏱ {formatTime(elapsed)}</span>
            )}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Circuit Diagram */}
        <div className="diagram-container">
          <img
            src={question.image_filename}
            alt={`Circuit diagram for question ${questionNumber}`}
            className="diagram-img clickable-img"
            onClick={() => setEnlarged(true)}
          />
        </div>
        {enlarged && (
          <ImageModal
            src={question.image_filename}
            alt={`Circuit diagram for question ${questionNumber}`}
            onClose={() => setEnlarged(false)}
          />
        )}

        {/* Options */}
        <div className="options-grid">
          {OPTION_LABELS.map((label, i) => {
            const text = question[OPTION_KEYS[i]];
            const isSelected = selectedOption === label;
            return (
              <button
                key={label}
                className={`option-btn ${isSelected ? 'option-selected' : ''}`}
                onClick={() => onSelectOption(label)}
              >
                <span className="option-label">{label}</span>
                <span className="option-text">{text}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="quiz-nav">
          <button className="nav-btn nav-prev" onClick={onPrev} disabled={isFirst}>
            ← Previous
          </button>
          <button
            className={`nav-btn nav-next ${!selectedOption ? 'nav-disabled' : ''}`}
            onClick={onNext}
            disabled={!selectedOption}
          >
            {isLast ? 'Finish Quiz' : 'Next →'}
          </button>
        </div>

        {!selectedOption && (
          <p className="select-hint">Select an answer to continue</p>
        )}
      </div>
    </div>
  );
}
