import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchWithRetry(url, revalidateSecs, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: revalidateSecs }
      });
      
      if (res.status === 429) {
        console.warn(`Rate limited (429) on ${url}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export async function GET(request, { params }) {
  const { year, round } = await params;
  const currentYear = new Date().getFullYear();
  const isPastYear = parseInt(year, 10) < currentYear;
  const revalidateSecs = isPastYear ? 31536000 : 86400; // 1 year for past seasons, 1 day for current season

  try {
    const [resData, qualData, sprintData] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/results.json`, { next: { revalidate: revalidateSecs } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/qualifying.json`, { next: { revalidate: revalidateSecs } }),
      fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}/sprint.json`, { next: { revalidate: revalidateSecs } })
    ]);

    const resultsJson = await resData.json();
    const qualJson = await qualData.json();
    const sprintJson = await sprintData.json();
    
    let race = resultsJson?.MRData?.RaceTable?.Races?.[0];
    
    // Fallback: If race hasn't happened, fetch schedule to get the exact date
    if (!race) {
      const scheduleRes = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${round}.json`, { next: { revalidate: revalidateSecs } });
      if (scheduleRes.ok) {
        const schedJson = await scheduleRes.json();
        race = schedJson?.MRData?.RaceTable?.Races?.[0];
      }
    }

    const results = race?.Results || [];
    const qualifying = qualJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
    const sprint = sprintJson?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [];

    // --- OpenF1 Sprint Qualifying Integration ---
    let sprintQualifying = [];
    if (race && race.date) {
      const raceDate = new Date(race.date);
      
      const openF1SessionsRes = await fetchWithRetry(
        `https://api.openf1.org/v1/sessions?year=${year}&session_name=Sprint%20Qualifying`,
        revalidateSecs
      );
      
      if (openF1SessionsRes && openF1SessionsRes.ok) {
        const openF1Sessions = await openF1SessionsRes.json();
        
        // Find a Sprint Quali session that happened within 5 days of the main race
        const targetSession = openF1Sessions.find(s => {
           const sDate = new Date(s.date_start);
           const diffTime = Math.abs(raceDate - sDate);
           const diffDays = diffTime / (1000 * 60 * 60 * 24);
           return diffDays <= 5;
        });

        if (targetSession) {
          const [driversRes, lapsRes] = await Promise.all([
            fetchWithRetry(`https://api.openf1.org/v1/drivers?session_key=${targetSession.session_key}`, revalidateSecs),
            fetchWithRetry(`https://api.openf1.org/v1/laps?session_key=${targetSession.session_key}`, revalidateSecs)
          ]);

          if (driversRes && lapsRes && driversRes.ok && lapsRes.ok) {
            const driversData = await driversRes.json();
            const lapsData = await lapsRes.json();

            const bestLaps = {};
            lapsData.forEach(lap => {
              if (lap.lap_duration) {
                if (!bestLaps[lap.driver_number] || lap.lap_duration < bestLaps[lap.driver_number]) {
                  bestLaps[lap.driver_number] = lap.lap_duration;
                }
              }
            });

            const formatLapTime = (seconds) => {
              if (!seconds) return '-';
              const m = Math.floor(seconds / 60);
              const s = (seconds % 60).toFixed(3).padStart(6, '0');
              return `${m}:${s}`;
            };

            const driversWithLaps = driversData.map(driver => ({
                 driverObj: driver,
                 bestLap: bestLaps[driver.driver_number] || 99999,
                 formattedLap: formatLapTime(bestLaps[driver.driver_number])
            }));

            driversWithLaps.sort((a, b) => a.bestLap - b.bestLap);

            sprintQualifying = driversWithLaps.map((d, index) => {
               const pos = d.bestLap === 99999 ? "NC" : index + 1;
               return {
                 position: pos === "NC" ? 99 : pos,
                 positionText: pos.toString(),
                 Driver: {
                   givenName: d.driverObj.first_name,
                   familyName: d.driverObj.last_name
                 },
                 Constructor: {
                   name: d.driverObj.team_name
                 },
                 status: pos === "NC" ? "No Time" : "Finished",
                 Q1: d.formattedLap
               };
            });
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
