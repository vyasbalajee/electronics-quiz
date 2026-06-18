import React from 'react';
import './VideoModal.css';

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  // Handle various YouTube URL formats
  const regexes = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const regex of regexes) {
    const match = url.match(regex);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url; // Return as-is if not a recognized YouTube format
}

export default function VideoModal({ videoUrl, questionNumber, onClose }) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Question {questionNumber} — Video Explanation</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-video">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`Question ${questionNumber} explanation`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <p className="modal-error">Invalid video URL</p>
          )}
        </div>
      </div>
    </div>
  );
}
