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
            <h3>A fresh new look</h3>
            <ul>
              <li>
                <strong>The whole app has been redesigned.</strong> A warmer,
                friendlier look across every screen &mdash; sign-in, quizzes,
                results, and dashboards &mdash; that&rsquo;s easier to read and
                nicer to use.
              </li>
              <li>
                <strong>Light and dark mode.</strong> Use the switch in the
                bottom-right corner to flip between light and dark anytime. Your
                choice is remembered and follows your account across devices.
              </li>
            </ul>
          </section>
        </div>

        <button className="whatsnew-btn" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
