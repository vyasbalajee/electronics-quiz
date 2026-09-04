import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './VersionNotes.css';

const API = process.env.REACT_APP_API_URL;

// A top-of-screen "Version notes" button, shown only to users who hold the
// changelog.view permission. Opens a modal with the full history by version,
// in plain functional language (no technical detail).
export default function VersionNotes() {
  const { user, token } = useAuth();
  const [canView, setCanView] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) { setCanView(false); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/users/me/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setCanView((data.effective || []).includes('changelog.view'));
        }
      } catch (e) {
        // ignore — button just won't show
      }
    })();
    return () => { cancelled = true; };
  }, [user, token]);

  if (!canView) return null;

  return (
    <>
      <button className="version-notes-btn" onClick={() => setOpen(true)}>Version notes</button>
      {open && (
        <div className="vn-overlay" onClick={() => setOpen(false)}>
          <div className="vn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vn-head">
              <h2 className="vn-title">Version Notes</h2>
              <button className="vn-close" onClick={() => setOpen(false)}>&times;</button>
            </div>

            <div className="vn-body">
              <section className="vn-version">
                <h3>v1.2</h3>
                <ul>
                  <li><strong>Enable or disable questions.</strong> A question can be switched off so it no longer appears in any quiz, without deleting it &mdash; and switched back on later.</li>
                  <li><strong>Filter the question list.</strong> Questions can be narrowed by topic, difficulty, and time limit (combined together), and search now covers the entire question bank.</li>
                  <li><strong>Version notes.</strong> This page &mdash; a full history of what has changed, available to those given permission to view it.</li>
                </ul>
              </section>

              <section className="vn-version">
                <h3>v1.1</h3>
                <ul>
                  <li><strong>Permissions.</strong> Admins can fine-tune what each person can do beyond their role, granting or revoking individual capabilities for a single user.</li>
                  <li><strong>Instructors can manage topics.</strong> Creating and removing quiz topics no longer requires an admin.</li>
                  <li><strong>Smoother sign-in.</strong> Only failed sign-in attempts count toward the temporary lockout, so normal use is never interrupted.</li>
                  <li><strong>Faster updates.</strong> New versions now reach everyone on their next visit.</li>
                </ul>
              </section>

              <section className="vn-version">
                <h3>v1.0</h3>
                <ul>
                  <li><strong>The quiz platform.</strong> Image-based electronics quizzes with multiple-choice answers, per-question timers, and instant results.</li>
                  <li><strong>Random and topic quizzes.</strong> Take a random set, or a topic quiz that steps through difficulty levels.</li>
                  <li><strong>Accounts and roles.</strong> Students, instructors, and admins, with secure sign-in, email verification, and password reset.</li>
                  <li><strong>Account provisioning.</strong> Instructors and admins create accounts by name and email; people activate their account through &ldquo;Forgot Password.&rdquo;</li>
                  <li><strong>Question management.</strong> Upload questions one at a time or in bulk, edit them, assign topics and difficulty, and attach explainer videos.</li>
                  <li><strong>Instructor analytics.</strong> Attempts, average scores, per-question and per-topic difficulty insights, and individual student histories.</li>
                  <li><strong>Admin tools.</strong> User management, an audit log, and a maintenance mode.</li>
                  <li><strong>Reliability and security.</strong> Automated database backups, automatic cleanup of unused images, and hardened credentials.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
