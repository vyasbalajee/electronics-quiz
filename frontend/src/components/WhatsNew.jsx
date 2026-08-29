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
            <h3>For everyone</h3>
            <ul>
              <li>
                <strong>Smoother sign-in.</strong> Signing in and out normally
                won&rsquo;t lock you out anymore &mdash; the safety limit now only
                kicks in after several failed attempts.
              </li>
            </ul>
          </section>

          <section className="whatsnew-section">
            <h3>For instructors</h3>
            <ul>
              <li>
                <strong>Manage topics yourself.</strong> Creating and removing
                quiz topics no longer needs an admin.
              </li>
            </ul>
          </section>

          <section className="whatsnew-section">
            <h3>For admins</h3>
            <ul>
              <li>
                <strong>New Permissions panel.</strong> In the Users list, click
                &ldquo;Permissions&rdquo; on any user to switch individual
                capabilities on or off &mdash; without changing their whole role
                (for example, let one student upload questions).
              </li>
            </ul>
          </section>
        </div>

        <button className="whatsnew-btn" onClick={dismiss}>Got it</button>
      </div>
    </div>
  );
}
