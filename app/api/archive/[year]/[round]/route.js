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
    
    const results = resultsJson?.MRData?.RaceTable?.Races?.[0]?.Results || [];
    const qualifying = qualJson?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [];
    const sprint = sprintJson?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [];

    return NextResponse.json({
      results,
      qualifying,
      sprint
    });

  } catch (error) {
    console.error(`Error fetching sessions for season ${year} round ${round}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
