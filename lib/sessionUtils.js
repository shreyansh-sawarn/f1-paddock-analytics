// Shared session-timing helpers.
//
// F1 doesn't publish official session end times, so we approximate using
// each session's typical maximum duration. This is used both to badge a
// session "Live"/"Completed" in the schedule UI, and to decide when a
// session's results become available to show (quali/sprint results should
// surface as soon as that session is over, without waiting for the full
// race weekend to finish).

export function getSessionDurationMs(name) {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('qualifying') || lowerName.includes('sprint')) {
    return 1.5 * 60 * 60 * 1000; // Qualifying, Sprint, Sprint Qualifying
  }
  if (lowerName === 'race') {
    return 3 * 60 * 60 * 1000; // Main race maximum absolute limit
  }
  return 1 * 60 * 60 * 1000; // Free Practice default
}

// startTime may be a Date, or anything Date() can parse (ISO string, etc).
export function getSessionEndTime(startTime, name) {
  if (!startTime) return null;
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + getSessionDurationMs(name));
}

export function getSessionState(name, startTime, now = new Date()) {
  if (!startTime) return 'future';
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(start.getTime())) return 'future';
  const end = getSessionEndTime(start, name);

  if (now > end) return 'completed';
  if (now >= start && now <= end) return 'live';
  return 'future';
}

// Note: this file intentionally no longer has a "which session/round is
// visible" helper. That decision now lives in /api/results/route.js and is
// driven by actual published data (Ergast qualifying.json/sprint.json/
// results.json, or an OpenF1 chequered-flag check for Sprint Qualifying -
// see lib/openf1.js) rather than a guessed session duration, since red
// flags and rain delays routinely push a session past its scheduled slot.
// The functions above remain in use for the schedule page's "Live" badge,
// where a soft estimate is an acceptable, low-stakes approximation.
