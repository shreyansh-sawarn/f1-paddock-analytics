import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { year } = await params;
  const currentYear = new Date().getFullYear();
  const isPastYear = parseInt(year, 10) < currentYear;
  const revalidateSecs = isPastYear ? 31536000 : 86400; // 1 year for past seasons, 1 day for current season

  try {
    async function fetchAllResults(year) {
      const firstRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=100&offset=0`, { next: { revalidate: revalidateSecs } });
      const firstData = await firstRes.json();
      const total = parseInt(firstData.MRData.total) || 0;
      
      let allRaces = [...(firstData.MRData.RaceTable.Races || [])];
      
      if (total > 100) {
        const fetches = [];
        for (let offset = 100; offset < total; offset += 100) {
          fetches.push(fetch(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=100&offset=${offset}`, { next: { revalidate: revalidateSecs } }).then(r => r.json()));
        }
        const restData = await Promise.all(fetches);
        
        restData.forEach(data => {
          const races = data.MRData?.RaceTable?.Races || [];
          races.forEach(race => {
            const existingRace = allRaces.find(r => r.round === race.round);
            if (existingRace) {
              existingRace.Results.push(...race.Results);
            } else {
              allRaces.push(race);
            }
          });
        });
      }
      return allRaces;
    }

    const [wdcRes, wccRes, resultsData] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings/1.json`, { next: { revalidate: revalidateSecs } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings/1.json`, { next: { revalidate: revalidateSecs } }),
      fetchAllResults(year)
    ]);

    const wdcData = await wdcRes.json();
    const wccData = await wccRes.json();

    const driverStandings = wdcData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0];
    const constructorStandings = wccData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0];
    
    let wdc = null;
    if (driverStandings) {
      wdc = {
        driver: `${driverStandings.Driver.givenName} ${driverStandings.Driver.familyName}`,
        points: driverStandings.points,
        constructor: driverStandings.Constructors[0]?.name,
        constructorId: driverStandings.Constructors[0]?.constructorId || null
      };
    }

    let wcc = null;
    if (constructorStandings) {
      wcc = {
        name: constructorStandings.Constructor.name,
        constructorId: constructorStandings.Constructor.constructorId || null,
        points: constructorStandings.points
      };
    }

    let races = resultsData || [];
    
    // If results are missing (future races or incomplete data), fallback to schedule
    if (races.length === 0) {
      const fallbackRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}.json?limit=100`, { next: { revalidate: revalidateSecs } });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        races = fallbackData?.MRData?.RaceTable?.Races || [];
      }
    }

    return NextResponse.json({
      year,
      wdc,
      wcc,
      races
    });

  } catch (error) {
    console.error(`Error fetching season ${year}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
