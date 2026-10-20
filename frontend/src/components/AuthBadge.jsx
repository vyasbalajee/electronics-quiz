import React, { useState } from 'react';

// The ETALVIS sign-in badge. The animated E (LED glow + radial lightning) plays
// for everyone by default; clicking the badge toggles the effect off/on and the
// choice is remembered per-browser (localStorage). Pre-auth screen, so this is a
// browser-level preference, not a per-account one.
export default function AuthBadge() {
  const [effects, setEffects] = useState(() => {
    try { return localStorage.getItem('logoEffects') !== 'off'; } catch { return true; }
  });

  function toggle() {
    setEffects((prev) => {
      const next = !prev;
      try { localStorage.setItem('logoEffects', next ? 'on' : 'off'); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <button
      type="button"
      className={`auth-badge${effects ? '' : ' effects-off'}`}
      onClick={toggle}
      title={effects ? 'Click to turn off logo effects' : 'Click to turn on logo effects'}
      aria-label={effects ? 'Turn off logo animation' : 'Turn on logo animation'}
    >
      <span className="bw-etal">
        <span className="bw-e">
          E
          <span className="ray r1" />
          <span className="ray r2" />
          <span className="ray r3" />
          <span className="ray r4" />
          <span className="ray r5" />
          <span className="ray r6" />
          <span className="ray r7" />
          <span className="ray r8" />
          <span className="ray r9" />
          <span className="ray r10" />
        </span>TAL
      </span>
      <span className="bw-vis">VIS</span>
    </button>
  );
}
