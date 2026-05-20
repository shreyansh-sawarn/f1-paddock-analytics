import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch the full current season results with pagination to handle the 100-item limit
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

    return NextResponse.json(completedRaces);
  } catch (error) {
    console.error('Error fetching F1 results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
