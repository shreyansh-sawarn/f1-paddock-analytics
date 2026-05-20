import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { year, round } = await params;

  try {
    const [resData, qualData, sprintData] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`, { next: { revalidate: 86400 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/qualifying.json`, { next: { revalidate: 86400 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/sprint.json`, { next: { revalidate: 86400 } })
    ]);

    const resultsJson = await resData.json();
    const qualJson = await qualData.json();
    const sprintJson = await sprintData.json();
    
    const race = resultsJson?.MRData?.RaceTable?.Races?.[0];
    const results = race?.Results || [];
    const qualifying = qualJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
    const sprint = sprintJson?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [];

    // --- OpenF1 Sprint Qualifying Integration ---
    let sprintQualifying = [];
    if (race && race.Circuit?.Location?.country) {
      const countryName = race.Circuit.Location.country;
      
      const openF1SessionsRes = await fetch(`https://api.openf1.org/v1/sessions?year=${year}&session_name=Sprint%20Qualifying`);
      if (openF1SessionsRes.ok) {
        const openF1Sessions = await openF1SessionsRes.json();
        const raceMonth = new Date(race.date).getMonth();
        
        const targetSession = openF1Sessions.find(s => {
           const sMonth = new Date(s.date_start).getMonth();
           return s.country_name === countryName && sMonth === raceMonth;
        });

        if (targetSession) {
          const [driversRes, positionsRes] = await Promise.all([
            fetch(`https://api.openf1.org/v1/drivers?session_key=${targetSession.session_key}`),
            fetch(`https://api.openf1.org/v1/position?session_key=${targetSession.session_key}`)
          ]);

          if (driversRes.ok && positionsRes.ok) {
            const driversData = await driversRes.json();
            const positionsData = await positionsRes.json();

            const finalPositions = {};
            positionsData.forEach(pos => {
              finalPositions[pos.driver_number] = pos.position;
            });

            sprintQualifying = driversData.map(driver => {
               return {
                 position: finalPositions[driver.driver_number] || 99,
                 positionText: finalPositions[driver.driver_number] || "NC",
                 Driver: {
                   givenName: driver.first_name,
                   familyName: driver.last_name
                 },
                 Constructor: {
                   name: driver.team_name
                 },
                 status: "Finished",
                 Q1: driver.broadcast_name
               };
            }).sort((a, b) => a.position - b.position);
          }
        }
      }
    }

    return NextResponse.json({
      results,
      qualifying,
      sprint,
      sprintQualifying
    });

  } catch (error) {
    console.error(`Error fetching sessions for season ${year} round ${round}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
