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

// Given a race object shaped like Ergast's schedule entries (fields like
// Qualifying/Sprint/SprintQualifying/date/time), returns the end time of the
// earliest session that produces a "results" table in this app - i.e. the
// point at which the race weekend should first appear as having results.
// Falls back to the race itself if none of those sessions are present.
export function getFirstResultsSessionEndTime(race) {
  const toStart = (session) => session ? new Date(`${session.date}T${session.time || '00:00:00Z'}`) : null;

  const candidates = [
    race.SprintQualifying && getSessionEndTime(toStart(race.SprintQualifying), 'Sprint Qualifying'),
    race.Sprint && getSessionEndTime(toStart(race.Sprint), 'Sprint'),
    race.Qualifying && getSessionEndTime(toStart(race.Qualifying), 'Qualifying'),
  ].filter(Boolean);

  if (candidates.length === 0) {
    const raceStart = race.date ? new Date(`${race.date}T${race.time || '00:00:00Z'}`) : null;
    return getSessionEndTime(raceStart, 'Race');
  }

  return new Date(Math.min(...candidates.map(d => d.getTime())));
}

// Of the sessions that produce a "results" table in this app (Sprint
// Qualifying, Sprint, Qualifying), returns the name of whichever one most
// recently finished - or null if none have finished yet. Handy for a
// "Qualifying complete" style status badge before the race itself is run.
export function getLatestCompletedResultsSession(race, now = new Date()) {
  const sessions = [
    race.SprintQualifying && { name: 'Sprint Qualifying', session: race.SprintQualifying },
    race.Sprint && { name: 'Sprint', session: race.Sprint },
    race.Qualifying && { name: 'Qualifying', session: race.Qualifying },
  ].filter(Boolean);

  const completed = sessions
    .map(({ name, session }) => ({
      name,
      start: new Date(`${session.date}T${session.time || '00:00:00Z'}`)
    }))
    .filter(({ name, start }) => getSessionState(name, start, now) === 'completed');

  if (completed.length === 0) return null;
  completed.sort((a, b) => b.start - a.start);
  return completed[0].name;
}
