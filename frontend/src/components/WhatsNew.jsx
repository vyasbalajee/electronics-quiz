import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../version';
import './WhatsNew.css';

const SEEN_KEY = 'whatsNewSeenVersion';

// Shows a one-time "What's New" popup after login, once per app version.
// When you bump the version and update the notes below, every user sees it
// again on their next login (tracked per browser via localStorage).
export default function WhatsNew() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return; // only after login
    let seen = null;
    try {
      seen = localStorage.getItem(SEEN_KEY);
    } catch (e) {
      seen = null;
    }
    if (seen !== APP_VERSION) setShow(true);
  }, [user]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, APP_VERSION);
    } catch (e) {
      // ignore storage errors — worst case the popup shows again next time
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="whatsnew-overlay" onClick={dismiss}>
      <div className="whatsnew-modal" onClick={(e) => e.stopPropagation()}>
        <div className="whatsnew-head">
          <h2 className="whatsnew-title">What&rsquo;s New</h2>
          <span className="whatsnew-version">v{APP_VERSION}</span>
        </div>

        <div className="whatsnew-body">
          <section className="whatsnew-section">
            <h3>For instructors and admins</h3>
            <ul>
              <li>
                <strong>Turn questions on or off.</strong> A question can be
                disabled so it no longer appears in any quiz &mdash; without
                deleting it &mdash; and re-enabled anytime.
              </li>
              <li>
                <strong>Filter the question list.</strong> Narrow questions by
                topic, difficulty, and time limit (combined), with search across
                the whole question bank.
              </li>
            </ul>
          </section>

          <section className="whatsnew-section">
            <h3>For admins</h3>
            <ul>
              <li>
                <strong>Version notes.</strong> A new top-of-screen button opens
                a full history of what has changed, version by version. You can
                grant this to others through the permissions panel.
              </li>
            </ul>
          </section>
        </div>

        <button className="whatsnew-btn" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
