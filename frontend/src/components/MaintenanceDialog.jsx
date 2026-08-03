import React from 'react';
import './MaintenanceDialog.css';

export default function MaintenanceDialog({ onStaffLogin }) {
  return (
    <div className="maint-wrapper">
      <div className="maint-card">
        <div className="maint-icon">🛠️</div>
        <h1 className="maint-title">Under Maintenance</h1>
        <p className="maint-text">
          The site is temporarily unavailable while we make some updates.
          Please check back shortly.
        </p>
        <button className="maint-staff-btn" onClick={onStaffLogin}>
          Staff sign in
        </button>
      </div>
    </div>
  );
}
