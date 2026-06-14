import React from 'react';
import './QuestionCard.css';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];
const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];

const API = process.env.REACT_APP_API_URL;

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
}) {
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="quiz-wrapper">
      <div className="quiz-card">

        {/* Header */}
        <div className="quiz-header">
          <span className="quiz-counter">
            Question <strong>{questionNumber}</strong> / {totalQuestions}
          </span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Circuit Diagram */}
        <div className="diagram-container">
          <img
            src={question.image_filename}
            alt={`Circuit diagram for question ${questionNumber}`}
            className="diagram-img"
          />
        </div>

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
          <button
            className="nav-btn nav-prev"
            onClick={onPrev}
            disabled={isFirst}
          >
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
