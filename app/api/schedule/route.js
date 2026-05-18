import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Fetch current season's schedule
    const res = await fetch('https://api.jolpi.ca/ergast/f1/current.json', { next: { revalidate: 3600 } });
    const data = await res.json();
    
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) {
      return NextResponse.json({ error: 'No schedule found' }, { status: 404 });
    }

    // 2. Check if the season is completely over
    const lastRace = races[races.length - 1];
    const lastRaceDate = new Date(`${lastRace.date}T${lastRace.time || '00:00:00Z'}`);
    const now = new Date();

    // 3. If the current date is past the last race, attempt to fetch the next season
    if (now > lastRaceDate) {
      const currentYear = parseInt(data.MRData.RaceTable.season, 10);
      const nextYear = currentYear + 1;
      
      const nextRes = await fetch(`https://api.jolpi.ca/ergast/f1/${nextYear}.json`, { next: { revalidate: 3600 } });
      if (nextRes.ok) {
        const nextData = await nextRes.json();
        const nextRaces = nextData.MRData.RaceTable.Races;
        if (nextRaces && nextRaces.length > 0) {
          return NextResponse.json(nextRaces);
        }
      }
    }

    // 4. Otherwise, return current season
    return NextResponse.json(races);

  } catch (error) {
    console.error('Error fetching F1 schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
