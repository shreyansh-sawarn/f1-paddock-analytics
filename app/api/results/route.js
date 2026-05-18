import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch the full current season results (limit=1000 fixes the pagination issue)
    const response = await fetch('https://api.jolpi.ca/ergast/f1/current/results.json?limit=1000', {
      next: { revalidate: 3600 } // Cache for an hour
    });
    
    if (!response.ok) {
      throw new Error(`Ergast API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    const completedRaces = data.MRData.RaceTable.Races || [];

    return NextResponse.json(completedRaces);
  } catch (error) {
    console.error('Error fetching F1 results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
