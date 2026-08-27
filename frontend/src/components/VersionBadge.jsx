import React from 'react';
import { APP_VERSION } from '../version';
import './VersionBadge.css';

export default function VersionBadge() {
  return <div className="app-version">v{APP_VERSION}</div>;
}
