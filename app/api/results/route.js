import { NextResponse } from 'next/server';
import { fetchOpenF1SessionsForYear, matchOpenF1Session, fetchChequeredFlagEnd } from '@/lib/openf1';

async function fetchJson(url, revalidateSecs) {
  try {
    const res = await fetch(url, { next: { revalidate: revalidateSecs } });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    return null;
  }
}

export async function GET() {
  try {
    // 1. Fetch the season schedule so we know every round, regardless of
    // whether the race itself has happened yet.
    const scheduleData = await fetchJson('https://api.jolpi.ca/ergast/f1/current.json', 3600);
    if (!scheduleData) throw new Error('Failed to fetch Ergast schedule');
    const scheduledRaces = scheduleData.MRData.RaceTable.Races || [];

    // 2. Fetch the full current season race results with pagination to handle the 100-item limit.
    const firstData = await fetchJson('https://api.jolpi.ca/ergast/f1/current/results.json?limit=100&offset=0', 3600);
    if (!firstData) throw new Error('Failed to fetch Ergast results');
    const total = parseInt(firstData.MRData.total) || 0;

    let completedRaces = [...(firstData.MRData.RaceTable.Races || [])];

    if (total > 100) {
      const fetches = [];
      for (let offset = 100; offset < total; offset += 100) {
        fetches.push(fetchJson(`https://api.jolpi.ca/ergast/f1/current/results.json?limit=100&offset=${offset}`, 3600));
      }
      const restData = await Promise.all(fetches);

      restData.forEach(data => {
        const races = data?.MRData?.RaceTable?.Races || [];
        races.forEach(race => {
          const existingRace = completedRaces.find(r => r.round === race.round);
          if (existingRace) {
            existingRace.Results.push(...race.Results);
          } else {
            completedRaces.push(race);
          }
        });
      });
    }

    const finalResultsByRound = {};
    completedRaces.forEach(race => {
      finalResultsByRound[race.round] = race.Results;
    });

    // 3. A round's session results should surface the moment that session has
    // *genuinely* published results - not a guessed "start + typical duration",
    // which red flags/rain delays routinely blow past. For qualifying/sprint/
    // race, Ergast simply won't have entries until the session is fully
    // classified, so checking for real data is itself immune to overruns.
    // Only rounds still missing final results need this extra check -
    // everything else is already confirmed done via the fetch above.
    const roundsNeedingCheck = scheduledRaces.filter(
      race => !(finalResultsByRound[race.round]?.length > 0)
    );

    const sessionChecks = await Promise.all(
      roundsNeedingCheck.map(async (race) => {
        const [qualData, sprintData] = await Promise.all([
          fetchJson(`https://api.jolpi.ca/ergast/f1/current/${race.round}/qualifying.json`, 300),
          fetchJson(`https://api.jolpi.ca/ergast/f1/current/${race.round}/sprint.json`, 300),
        ]);
        const hasQualifying = (qualData?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults?.length || 0) > 0;
        const hasSprint = (sprintData?.MRData?.RaceTable?.Races?.[0]?.SprintResults?.length || 0) > 0;
        return { round: race.round, hasQualifying, hasSprint };
      })
    );

    const sessionFlagsByRound = {};
    sessionChecks.forEach(({ round, hasQualifying, hasSprint }) => {
      sessionFlagsByRound[round] = { hasQualifying, hasSprint };
    });

    // 4. Ergast has no dedicated results endpoint for Sprint Qualifying (this
    // app derives it from OpenF1 lap times in the archive route), so there's
    // no "does qualifying.json have entries" equivalent to check. For the
    // narrow case of a round where *only* Sprint Qualifying might have run so
    // far, confirm it has truly finished via OpenF1's race control feed (a
    // genuine CHEQUERED flag event), instead of guessing a duration.
    const roundsNeedingSprintQualiCheck = roundsNeedingCheck.filter(race => {
      const flags = sessionFlagsByRound[race.round];
      return race.SprintQualifying && !flags?.hasQualifying && !flags?.hasSprint;
    });

    let openf1Sessions = [];
    if (roundsNeedingSprintQualiCheck.length > 0) {
      const year = scheduleData.MRData.RaceTable.season;
      openf1Sessions = await fetchOpenF1SessionsForYear(year);
    }

    const sprintQualiFlagsByRound = {};
    await Promise.all(
      roundsNeedingSprintQualiCheck.map(async (race) => {
        const match = matchOpenF1Session(
          openf1Sessions,
          race.SprintQualifying.date,
          race.SprintQualifying.time,
          'Sprint Qualifying'
        );
        const chequeredEnd = match ? await fetchChequeredFlagEnd(match.session_key, 120) : null;
        sprintQualiFlagsByRound[race.round] = !!chequeredEnd;
      })
    );

    // 5. A round is visible once any session that produces a "results" tab
    // in this app has genuinely finished. Each has*/ flag below is likewise
    // real (data- or chequered-flag-backed), so ResultCard can trust them
    // for its status badge without doing any of its own time guessing.
    const visibleRaces = scheduledRaces
      .filter(race => {
        const hasFinalResults = (finalResultsByRound[race.round]?.length || 0) > 0;
        const flags = sessionFlagsByRound[race.round];
        const hasSprintQualifying = sprintQualiFlagsByRound[race.round];
        return hasFinalResults || flags?.hasQualifying || flags?.hasSprint || hasSprintQualifying;
      })
      .map(race => {
        const hasFinalResults = (finalResultsByRound[race.round]?.length || 0) > 0;
        const flags = sessionFlagsByRound[race.round];
        return {
          ...race,
          Results: finalResultsByRound[race.round] || [],
          hasQualifying: hasFinalResults || !!flags?.hasQualifying,
          hasSprint: hasFinalResults || !!flags?.hasSprint,
          hasSprintQualifying: hasFinalResults || !!sprintQualiFlagsByRound[race.round],
          hasRaceResults: hasFinalResults,
        };
      });

    return NextResponse.json(visibleRaces);
  } catch (error) {
    console.error('Error fetching F1 results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
