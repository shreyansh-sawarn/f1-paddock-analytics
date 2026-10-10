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

// OpenF1 rate-limits unauthenticated clients to ~3 requests/second and
// answers bursts with a 429. Back off and retry instead of treating that as
// "no data" (which silently hid finished sessions).
async function fetchOpenF1(url, revalidateSecs, retries = 3) {
  let delayMs = 700;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { next: { revalidate: revalidateSecs } });
    if (res.status !== 429 || attempt >= retries) return res;
    const retryAfter = parseInt(res.headers.get('retry-after'), 10);
    await new Promise(resolve => setTimeout(resolve, retryAfter ? retryAfter * 1000 : delayMs));
    delayMs *= 2;
  }
}

export async function fetchOpenF1SessionsForYear(year, revalidateSecs = 3600) {
  try {
    const res = await fetchOpenF1(`https://api.openf1.org/v1/sessions?year=${year}`, revalidateSecs);
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
    const res = await fetchOpenF1(
      `https://api.openf1.org/v1/race_control?session_key=${sessionKey}&flag=CHEQUERED`,
      revalidateSecs
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

const formatRaceTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

// Fetches OpenF1's classification for a session plus its driver list, but
// only once the session has genuinely finished (a CHEQUERED flag exists).
// Returns rows sorted the way Ergast orders them - classified positions
// first, then unclassified entries (null or non-numeric positions such as
// qualifying's "RT") by laps completed - or null if not available.
async function fetchFinishedClassification(sessionKey, revalidateSecs) {
  if (!sessionKey) return null;
  const finishedAt = await fetchChequeredFlagEnd(sessionKey, revalidateSecs);
  if (!finishedAt) return null;

  // Sequential on purpose - see fetchOpenF1's rate-limit note.
  const resultRes = await fetchOpenF1(`https://api.openf1.org/v1/session_result?session_key=${sessionKey}`, revalidateSecs);
  const driversRes = await fetchOpenF1(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, revalidateSecs);
  if (!resultRes.ok || !driversRes.ok) return null;
  const classification = await resultRes.json();
  const drivers = await driversRes.json();
  if (!classification?.length) return null;

  const rank = (r) => (typeof r.position === 'number' ? r.position : null);
  const sorted = [...classification].sort((a, b) => {
    if (rank(a) != null && rank(b) != null) return rank(a) - rank(b);
    if (rank(a) != null) return -1;
    if (rank(b) != null) return 1;
    return (b.number_of_laps || 0) - (a.number_of_laps || 0);
  });
  const openf1ByNumber = Object.fromEntries(drivers.map(d => [String(d.driver_number), d]));
  return { sorted, openf1ByNumber, rank };
}

// Reuses Ergast's own Driver/Constructor objects by car number when we have
// them (`ergastEntries` - any Ergast Results/QualifyingResults array from the
// same season), so names and constructorIds match the rest of the app
// ("Red Bull", not OpenF1's "Red Bull Racing").
const buildIdentity = (number, ergastByNumber, openf1ByNumber) => {
  const ergast = ergastByNumber[number];
  const openf1 = openf1ByNumber[number] || {};
  return {
    Driver: ergast?.Driver || {
      code: openf1.name_acronym,
      givenName: openf1.first_name,
      familyName: openf1.last_name,
    },
    Constructor: ergast?.Constructor || { name: openf1.team_name },
  };
};

const indexByNumber = (entries) => Object.fromEntries((entries || []).map(e => [String(e.number), e]));

// Provisional Race or Sprint classification from OpenF1, in the same shape as
// an Ergast `Results`/`SprintResults` array, for the gap between a session
// finishing and jolpica/Ergast publishing it (often a day or more). Returns
// [] until the session has genuinely finished.
export async function fetchOpenF1RaceResults(sessionKey, ergastEntries = [], revalidateSecs = 300) {
  try {
    const data = await fetchFinishedClassification(sessionKey, revalidateSecs);
    if (!data) return [];
    const { sorted, openf1ByNumber, rank } = data;
    const ergastByNumber = indexByNumber(ergastEntries);
    const leaderLaps = sorted[0]?.number_of_laps || 0;

    return sorted.map((r, index) => {
      const number = String(r.driver_number);
      const position = String(rank(r) ?? index + 1);
      const lapsDown = leaderLaps - (r.number_of_laps || 0);

      let status = 'Finished';
      let positionText = position;
      let time;
      if (r.dsq) {
        status = 'Disqualified';
        positionText = 'D';
      } else if (r.dns) {
        status = 'Did not start';
        positionText = 'W';
      } else if (r.dnf) {
        status = 'Retired';
        positionText = 'R';
      } else if (index === 0 && r.duration) {
        time = { time: formatRaceTime(r.duration) };
      } else if (typeof r.gap_to_leader === 'number') {
        time = { time: `+${r.gap_to_leader.toFixed(3)}` };
      } else if (lapsDown > 0) {
        status = `+${lapsDown} Lap${lapsDown > 1 ? 's' : ''}`;
      }

      return {
        number,
        position,
        positionText,
        points: String(r.points ?? 0),
        ...buildIdentity(number, ergastByNumber, openf1ByNumber),
        laps: String(r.number_of_laps ?? ''),
        status,
        ...(time && { Time: time }),
        provisional: true,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch OpenF1 race results for session ${sessionKey}:`, err);
    return [];
  }
}

// Provisional Qualifying classification from OpenF1, in the same shape as an
// Ergast `QualifyingResults` array (Q1/Q2/Q3 lap times). Returns [] until the
// session has genuinely finished (after the Q3 chequered flag).
export async function fetchOpenF1QualifyingResults(sessionKey, ergastEntries = [], revalidateSecs = 300) {
  try {
    const data = await fetchFinishedClassification(sessionKey, revalidateSecs);
    if (!data) return [];
    const { sorted, openf1ByNumber, rank } = data;
    const ergastByNumber = indexByNumber(ergastEntries);
    const lap = (d) => (typeof d === 'number' ? formatRaceTime(d) : undefined);

    return sorted.map((r, index) => {
      const number = String(r.driver_number);
      const [q1, q2, q3] = Array.isArray(r.duration) ? r.duration : [];
      return {
        number,
        position: String(rank(r) ?? index + 1),
        ...buildIdentity(number, ergastByNumber, openf1ByNumber),
        ...(lap(q1) && { Q1: lap(q1) }),
        ...(lap(q2) && { Q2: lap(q2) }),
        ...(lap(q3) && { Q3: lap(q3) }),
        provisional: true,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch OpenF1 qualifying results for session ${sessionKey}:`, err);
    return [];
  }
}
