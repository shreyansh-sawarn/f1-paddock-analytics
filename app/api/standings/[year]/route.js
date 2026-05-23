import { NextResponse } from 'next/server';

// Helper to fetch with retries on rate limits (429) or transient errors
async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      
      // If rate limited, backoff exponentially or respect Retry-After
      if (res.status === 429 && i < retries - 1) {
        const retryAfter = res.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * Math.pow(2, i);
        console.warn(`[API] Rate limited (429) on ${url}. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // For other issues, retry if we have retries left
      if (i < retries - 1) {
        const waitTime = delay * Math.pow(2, i);
        console.warn(`[API] Fetch failed with status ${res.status} for ${url}. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      const waitTime = delay * Math.pow(2, i);
      console.warn(`[API] Fetch error for ${url}: ${err.message}. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

export async function GET(request, { params }) {
  const { year } = await params;

  try {
    // 1. Fetch WDC and WCC standings in parallel with retry
    const [wdcRes, wccRes] = await Promise.all([
      fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json?limit=100`, { next: { revalidate: 3600 } }),
      fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json?limit=100`, { next: { revalidate: 3600 } })
    ]);

    let wdcData = null;
    let wccData = null;

    if (wdcRes && wdcRes.ok) wdcData = await wdcRes.json();
    if (wccRes && wccRes.ok) wccData = await wccRes.json();

    const rawWdc = wdcData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    const rawWcc = wccData?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];

    // 2. Fetch all race results (paginated)
    async function fetchAllRaceResults(year) {
      try {
        const firstRes = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=100&offset=0`, { next: { revalidate: 3600 } });
        if (!firstRes || !firstRes.ok) return [];
        const firstData = await firstRes.json();
        const total = parseInt(firstData.MRData?.total) || 0;
        
        let allRaces = [...(firstData.MRData?.RaceTable?.Races || [])];
        
        if (total > 100) {
          // Fetch sequentially to prevent rate limits
          for (let offset = 100; offset < total; offset += 100) {
            const res = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=100&offset=${offset}`, { next: { revalidate: 3600 } });
            if (res && res.ok) {
              const data = await res.json();
              const races = data.MRData?.RaceTable?.Races || [];
              races.forEach(race => {
                const existingRace = allRaces.find(r => r.round === race.round);
                if (existingRace) {
                  existingRace.Results.push(...(race.Results || []));
                } else {
                  allRaces.push(race);
                }
              });
            }
          }
        }
        return allRaces;
      } catch (err) {
        console.error('Error fetching race results:', err);
        return [];
      }
    }

    // 3. Fetch all qualifying results (paginated)
    async function fetchAllQualyResults(year) {
      try {
        const firstRes = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/qualifying.json?limit=100&offset=0`, { next: { revalidate: 3600 } });
        if (!firstRes || !firstRes.ok) return [];
        const firstData = await firstRes.json();
        const total = parseInt(firstData.MRData?.total) || 0;
        
        let allQualyRaces = [...(firstData.MRData?.RaceTable?.Races || [])];
        
        if (total > 100) {
          // Fetch sequentially to prevent rate limits
          for (let offset = 100; offset < total; offset += 100) {
            const res = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/qualifying.json?limit=100&offset=${offset}`, { next: { revalidate: 3600 } });
            if (res && res.ok) {
              const data = await res.json();
              const races = data.MRData?.RaceTable?.Races || [];
              races.forEach(race => {
                const existingRace = allQualyRaces.find(r => r.round === race.round);
                if (existingRace) {
                  existingRace.QualifyingResults.push(...(race.QualifyingResults || []));
                } else {
                  allQualyRaces.push(race);
                }
              });
            }
          }
        }
        return allQualyRaces;
      } catch (err) {
        console.error('Error fetching qualy results:', err);
        return [];
      }
    }

    // 4. Fetch all sprint race results (paginated)
    async function fetchAllSprintResults(year) {
      try {
        const firstRes = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/sprint.json?limit=100&offset=0`, { next: { revalidate: 3600 } });
        if (!firstRes || !firstRes.ok) return [];
        const firstData = await firstRes.json();
        const total = parseInt(firstData.MRData?.total) || 0;
        
        let allSprints = [...(firstData.MRData?.RaceTable?.Races || [])];
        
        if (total > 100) {
          // Fetch sequentially to prevent rate limits
          for (let offset = 100; offset < total; offset += 100) {
            const res = await fetchWithRetry(`https://api.jolpi.ca/ergast/f1/${year}/sprint.json?limit=100&offset=${offset}`, { next: { revalidate: 3600 } });
            if (res && res.ok) {
              const data = await res.json();
              const races = data.MRData?.RaceTable?.Races || [];
              races.forEach(race => {
                const existingRace = allSprints.find(r => r.round === race.round);
                if (existingRace) {
                  existingRace.SprintResults.push(...(race.SprintResults || []));
                } else {
                  allSprints.push(race);
                }
              });
            }
          }
        }
        return allSprints;
      } catch (err) {
        console.error('Error fetching sprint results:', err);
        return [];
      }
    }

    const [allRaces, allQualyRaces, allSprints] = await Promise.all([
      fetchAllRaceResults(year),
      fetchAllQualyResults(year),
      fetchAllSprintResults(year)
    ]);

    // 4. Compute Driver stats
    const driverStats = {};
    
    // Sort races chronologically by round
    const sortedRaces = [...allRaces].sort((a, b) => parseInt(a.round) - parseInt(b.round));
    
    sortedRaces.forEach(race => {
      const round = parseInt(race.round);
      const results = race.Results || [];
      results.forEach(res => {
        const driverId = res.Driver.driverId;
        const pos = parseInt(res.position);
        const status = res.status;
        const isFinished = status === 'Finished' || status.startsWith('+');

        if (!driverStats[driverId]) {
          driverStats[driverId] = {
            finishes: [],
            qualyPositions: [],
            podiums: 0,
            recentForm: []
          };
        }

        if (isFinished && !isNaN(pos)) {
          driverStats[driverId].finishes.push(pos);
        }

        if (!isNaN(pos) && pos <= 3) {
          driverStats[driverId].podiums += 1;
        }

        driverStats[driverId].recentForm.push({
          round,
          pos: isFinished ? `P${pos}` : 'DNF'
        });
      });
    });

    // Process qualifying results
    allQualyRaces.forEach(race => {
      const qualyResults = race.QualifyingResults || [];
      qualyResults.forEach(res => {
        const driverId = res.Driver.driverId;
        const pos = parseInt(res.position);
        if (!isNaN(pos)) {
          if (!driverStats[driverId]) {
            driverStats[driverId] = {
              finishes: [],
              qualyPositions: [],
              podiums: 0,
              recentForm: []
            };
          }
          driverStats[driverId].qualyPositions.push(pos);
        }
      });
    });

    // 5. Compute Constructor stats
    const constructorStats = {};

    sortedRaces.forEach(race => {
      const results = race.Results || [];
      results.forEach(res => {
        const constructorId = res.Constructor.constructorId;
        const driverId = res.Driver.driverId;
        const driverName = `${res.Driver.givenName} ${res.Driver.familyName}`;
        const pos = parseInt(res.position);
        const points = parseFloat(res.points) || 0;

        if (!constructorStats[constructorId]) {
          constructorStats[constructorId] = {
            podiums: 0,
            bestFinish: null,
            drivers: {}
          };
        }

        const stats = constructorStats[constructorId];

        // Best finish & Podiums
        if (!isNaN(pos)) {
          if (stats.bestFinish === null || pos < stats.bestFinish) {
            stats.bestFinish = pos;
          }
          if (pos <= 3) {
            stats.podiums += 1;
          }
        }

        // Driver contribution breakdown
        if (!stats.drivers[driverId]) {
          stats.drivers[driverId] = {
            name: driverName,
            points: 0
          };
        }
        stats.drivers[driverId].points += points;
      });
    });

    // Add Sprint results to Driver contribution breakdown
    allSprints.forEach(race => {
      const sprintResults = race.SprintResults || [];
      sprintResults.forEach(res => {
        const constructorId = res.Constructor.constructorId;
        const driverId = res.Driver.driverId;
        const driverName = `${res.Driver.givenName} ${res.Driver.familyName}`;
        const points = parseFloat(res.points) || 0;

        if (!constructorStats[constructorId]) {
          constructorStats[constructorId] = {
            podiums: 0,
            bestFinish: null,
            drivers: {}
          };
        }

        const stats = constructorStats[constructorId];

        if (!stats.drivers[driverId]) {
          stats.drivers[driverId] = {
            name: driverName,
            points: 0
          };
        }
        stats.drivers[driverId].points += points;
      });
    });

    // 6. Map computations back to WDC
    const wdc = rawWdc.map(entry => {
      const driverId = entry.Driver.driverId;
      const stats = driverStats[driverId];

      let averageFinish = 'N/A';
      if (stats?.finishes && stats.finishes.length > 0) {
        const sum = stats.finishes.reduce((a, b) => a + b, 0);
        averageFinish = (sum / stats.finishes.length).toFixed(1);
      }

      let averageQualifying = 'N/A';
      if (stats?.qualyPositions && stats.qualyPositions.length > 0) {
        const sum = stats.qualyPositions.reduce((a, b) => a + b, 0);
        averageQualifying = (sum / stats.qualyPositions.length).toFixed(1);
      }

      // Sort recent form chronologically and slice the last 5
      const form = stats?.recentForm 
        ? stats.recentForm.sort((a, b) => a.round - b.round).slice(-5).map(f => f.pos)
        : [];

      return {
        position: entry.position,
        points: entry.points,
        wins: entry.wins,
        driverId,
        driverName: `${entry.Driver.givenName} ${entry.Driver.familyName}`,
        driverCode: entry.Driver.code || entry.Driver.familyName.slice(0, 3).toUpperCase(),
        nationality: entry.Driver.nationality,
        constructorName: entry.Constructors?.[0]?.name || 'N/A',
        constructorId: entry.Constructors?.[0]?.constructorId || 'N/A',
        averageFinish,
        averageQualifying,
        podiums: stats?.podiums || 0,
        recentForm: form
      };
    });

    // 7. Map computations back to WCC
    const wcc = rawWcc.map(entry => {
      const constructorId = entry.Constructor.constructorId;
      const stats = constructorStats[constructorId];

      const driverBreakdown = [];
      if (stats?.drivers) {
        Object.keys(stats.drivers).forEach(dId => {
          driverBreakdown.push({
            driverId: dId,
            name: stats.drivers[dId].name,
            points: Math.round(stats.drivers[dId].points * 100) / 100
          });
        });
        driverBreakdown.sort((a, b) => b.points - a.points);
      }

      return {
        position: entry.position,
        points: entry.points,
        wins: entry.wins,
        constructorId,
        constructorName: entry.Constructor.name,
        nationality: entry.Constructor.nationality,
        podiums: stats?.podiums || 0,
        bestFinish: stats?.bestFinish !== null ? `P${stats.bestFinish}` : 'N/A',
        driverBreakdown
      };
    });

    return NextResponse.json({
      year,
      wdc,
      wcc
    });

  } catch (error) {
    console.error(`Error processing standings for season ${year}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
