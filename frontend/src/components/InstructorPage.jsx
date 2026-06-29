import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './InstructorPage.css';

const API = process.env.REACT_APP_API_URL;

export default function InstructorPage({ onBack, embedded }) {
  const { token } = useAuth();
  const [csvFile, setCsvFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleCsvChange(e) { setCsvFile(e.target.files[0] || null); }
  function handleImagesChange(e) { setImageFiles(Array.from(e.target.files)); }

  async function handleUpload() {
    if (!csvFile) return setError('Please select a CSV file.');
    if (imageFiles.length === 0) return setError('Please select at least one image.');
    setError(null);
    setStatus('uploading');
    setResult(null);

    const formData = new FormData();
    formData.append('csvFile', csvFile);
    imageFiles.forEach((img) => formData.append('images', img));

    try {
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setStatus('error'); setError(data.error || 'Upload failed'); return; }
      setStatus('success');
      setResult(data);
      setCsvFile(null);
      setImageFiles([]);
      document.getElementById('csv-input').value = '';
      document.getElementById('images-input').value = '';
    } catch (err) {
      setStatus('error');
      setError('Network error — is the backend running?');
    }
  }

  return (
    <div className={embedded ? 'instructor-embedded' : 'instructor-wrapper'}>
      <div className={embedded ? '' : 'instructor-card'}>
        {!embedded && onBack && (
          <button className="back-btn" onClick={onBack}>← Back</button>
        )}
        {!embedded && <h2 className="instructor-title">Instructor Panel</h2>}
        <p className="instructor-subtitle">
          Upload a CSV file and the corresponding question images to add new questions.
        </p>
        <div className="format-guide">
          <p className="format-title">CSV Format</p>
          <code className="format-code">
            image_filename,...,correct_option,video_url,topics,time_limit_seconds,difficulty{'\n'}
            Slide1.JPG,...,A,https://youtu.be/...,Ohms Law;Series,30,3
          </code>
          <p className="format-note">
            video_url, topics, time_limit_seconds, and difficulty are optional. Separate multiple topics with a semicolon (;). Leave time_limit_seconds blank for unlimited. Difficulty is 1-10.
          </p>
        </div>
        <div className="upload-section">
          <label className="upload-label" htmlFor="csv-input">CSV File</label>
          <input id="csv-input" type="file" accept=".csv" onChange={handleCsvChange} className="upload-input" />
          {csvFile && <p className="file-selected">✓ {csvFile.name}</p>}
        </div>
        <div className="upload-section">
          <label className="upload-label" htmlFor="images-input">Question Images (select all at once)</label>
          <input id="images-input" type="file" accept="image/*" multiple onChange={handleImagesChange} className="upload-input" />
          {imageFiles.length > 0 && (
            <p className="file-selected">✓ {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} selected</p>
          )}
        </div>
        {error && <div className="upload-error">{error}</div>}
        {status === 'success' && result && (
          <div className="upload-result">
            <p className="result-success">✓ {result.uploaded} question{result.uploaded !== 1 ? 's' : ''} uploaded successfully</p>
            {result.errors?.length > 0 && (
              <div className="result-errors">
                <p className="result-errors-title">Warnings:</p>
                {result.errors.map((e, i) => <p key={i} className="result-error-item">⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}
        <button className="upload-btn" onClick={handleUpload} disabled={status === 'uploading'}>
          {status === 'uploading' ? 'Uploading...' : 'Upload Questions'}
        </button>
      </div>
    </div>
  );
}
