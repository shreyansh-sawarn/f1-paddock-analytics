// Helpers for getting a *real* session-completion signal from OpenF1,
// instead of guessing "session start + typical duration".
//
// Why this exists: Ergast/jolpica has no dedicated results endpoint for
// Sprint Qualifying, so there's no equivalent to "does qualifying.json have
// entries yet" to check whether it has actually finished. A fixed duration
// guess is wrong in both directions - red flags/rain routinely push a
// session well past its scheduled slot, so "now > scheduled end" can mark a
// session complete while it's still running. OpenF1's race_control feed
// includes a genuine CHEQUERED flag event the moment a session actually
// ends, so checking for that event is a ground-truth signal instead of a
// guess, at the cost of one extra request per session we need to confirm.

const SESSION_NAME_ALIASES = {
  'First Practice': ['Practice 1', 'Day 1'],
  'Second Practice': ['Practice 2', 'Day 2'],
  'Third Practice': ['Practice 3', 'Day 3'],
  'Sprint Qualifying': ['Sprint Qualifying'],
  'Sprint': ['Sprint'],
  'Qualifying': ['Qualifying'],
  'Race': ['Race'],
};

// Only trust an OpenF1 match if its start is within this many hours of the
// Ergast-listed start - guards against mismatching sessions across events.
const MATCH_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export async function fetchOpenF1SessionsForYear(year, revalidateSecs = 3600) {
  try {
    const res = await fetch(`https://api.openf1.org/v1/sessions?year=${year}`, {
      next: { revalidate: revalidateSecs }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch OpenF1 sessions:', err);
    return [];
  }
}

// Finds the OpenF1 session object (with its session_key) matching an Ergast
// session by name + closest start time. Returns null if nothing is within
// tolerance, so callers can fall back to a duration guess.
export function matchOpenF1Session(openf1Sessions, dateStr, timeStr, sessionLabel) {
  if (!dateStr || !openf1Sessions?.length) return null;
  const ergastStart = new Date(`${dateStr}T${timeStr || '00:00:00Z'}`);
  if (Number.isNaN(ergastStart.getTime())) return null;

  const candidateNames = SESSION_NAME_ALIASES[sessionLabel] || [sessionLabel];

  let best = null;
  let bestDiff = Infinity;
  for (const session of openf1Sessions) {
    if (!candidateNames.includes(session.session_name)) continue;
    const diff = Math.abs(new Date(session.date_start).getTime() - ergastStart.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = session;
    }
  }

  return best && bestDiff <= MATCH_TOLERANCE_MS ? best : null;
}

// Returns the real end time of a session (the last CHEQUERED flag event) if
// it has genuinely finished, or null if it hasn't (still running, or hasn't
// started - either way, not "over" yet). This is the actual signal, not an
// estimate, so it's unaffected by red flags, rain delays, restarts, etc.
export async function fetchChequeredFlagEnd(sessionKey, revalidateSecs = 60) {
  if (!sessionKey) return null;
  try {
    const res = await fetch(
      `https://api.openf1.org/v1/race_control?session_key=${sessionKey}&flag=CHEQUERED`,
      { next: { revalidate: revalidateSecs } }
    );
    if (!res.ok) return null;
    const messages = await res.json();
    if (!messages?.length) return null;
    // Qualifying reports one CHEQUERED flag per phase (Q1/Q2/Q3) - the
    // session is only truly over once the last one has been thrown.
    const latest = messages.reduce((latestDate, m) => {
      const d = new Date(m.date);
      return d > latestDate ? d : latestDate;
    }, new Date(0));
    return latest;
  } catch (err) {
    console.error(`Failed to fetch race control for session ${sessionKey}:`, err);
    return null;
  }
}

// Convenience wrapper: given an Ergast-shaped session ({date, time}) and a
// label, finds the matching OpenF1 session and checks whether it has really
// finished. Returns the real end Date if so, otherwise null.
export async function getRealSessionEnd(openf1Sessions, dateStr, timeStr, sessionLabel, revalidateSecs = 60) {
  const match = matchOpenF1Session(openf1Sessions, dateStr, timeStr, sessionLabel);
  if (!match) return null;
  return fetchChequeredFlagEnd(match.session_key, revalidateSecs);
}
