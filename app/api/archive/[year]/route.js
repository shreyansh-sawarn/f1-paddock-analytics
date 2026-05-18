import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { year } = await params;

  try {
    const [wdcRes, wccRes, racesRes] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings/1.json`, { next: { revalidate: 86400 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings/1.json`, { next: { revalidate: 86400 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`, { next: { revalidate: 86400 } })
    ]);

    const wdcData = await wdcRes.json();
    const wccData = await wccRes.json();
    const scheduleData = await racesRes.json();

    const driverStandings = wdcData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0];
    const constructorStandings = wccData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0];
    
    let wdc = null;
    if (driverStandings) {
      wdc = {
        driver: `${driverStandings.Driver.givenName} ${driverStandings.Driver.familyName}`,
        points: driverStandings.points,
        constructor: driverStandings.Constructors[0]?.name
      };
    }

    let wcc = null;
    if (constructorStandings) {
      wcc = {
        name: constructorStandings.Constructor.name,
        points: constructorStandings.points
      };
    }

    const races = scheduleData?.MRData?.RaceTable?.Races || [];

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
