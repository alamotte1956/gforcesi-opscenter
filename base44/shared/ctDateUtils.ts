// Shared date/time helpers for CT (America/Chicago) timezone, used by scheduled report functions.

export const ctDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) : null;

export const ctTime = (v) =>
  v ? new Date(v).toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }) : null;

export const ctToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });