import React from 'react';
import './ImageModal.css';

export default function ImageModal({ src, alt, onClose }) {
  return (
    <div className="img-modal-overlay" onClick={onClose}>
      <button className="img-modal-close" onClick={onClose}>✕</button>
      <img
        src={src}
        alt={alt || 'Enlarged image'}
        className="img-modal-image"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
