import { NextResponse } from 'next/server';
import { getFirstResultsSessionEndTime } from '@/lib/sessionUtils';

export async function GET() {
  try {
    // 1. Fetch the season schedule so we know every round's session times,
    // regardless of whether the race itself has happened yet. This is what
    // lets a round show up as soon as qualifying/sprint is over instead of
    // waiting for the full race weekend to finish.
    const scheduleRes = await fetch('https://api.jolpi.ca/ergast/f1/current.json', {
      next: { revalidate: 3600 }
    });

    if (!scheduleRes.ok) {
      throw new Error(`Ergast schedule API responded with status: ${scheduleRes.status}`);
    }

    const scheduleData = await scheduleRes.json();
    const scheduledRaces = scheduleData.MRData.RaceTable.Races || [];

    // 2. Fetch the full current season race results with pagination to handle the 100-item limit.
    const firstRes = await fetch('https://api.jolpi.ca/ergast/f1/current/results.json?limit=100&offset=0', {
      next: { revalidate: 3600 }
    });

    if (!firstRes.ok) {
      throw new Error(`Ergast API responded with status: ${firstRes.status}`);
    }

    const firstData = await firstRes.json();
    const total = parseInt(firstData.MRData.total) || 0;

    let completedRaces = [...(firstData.MRData.RaceTable.Races || [])];

    if (total > 100) {
      const fetches = [];
      for (let offset = 100; offset < total; offset += 100) {
        fetches.push(fetch(`https://api.jolpi.ca/ergast/f1/current/results.json?limit=100&offset=${offset}`, { next: { revalidate: 3600 } }).then(r => r.json()));
      }
      const restData = await Promise.all(fetches);

      restData.forEach(data => {
        const races = data.MRData?.RaceTable?.Races || [];
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

    // 3. A round should appear as soon as its earliest results-bearing
    // session (Sprint Qualifying, Sprint, or Qualifying - whichever exists)
    // has finished, not only once the race itself has final classification.
    const now = new Date();
    const visibleRaces = scheduledRaces
      .filter(race => {
        const firstSessionEnd = getFirstResultsSessionEndTime(race);
        return firstSessionEnd && now >= firstSessionEnd;
      })
      .map(race => ({
        ...race,
        Results: finalResultsByRound[race.round] || []
      }));

    return NextResponse.json(visibleRaces);
  } catch (error) {
    console.error('Error fetching F1 results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
