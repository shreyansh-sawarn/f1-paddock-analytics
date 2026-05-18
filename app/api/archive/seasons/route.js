import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.jolpi.ca/ergast/f1/seasons.json?limit=100', { next: { revalidate: 86400 } });
    const data = await res.json();
    
    if (!data.MRData || !data.MRData.SeasonTable) {
      return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 404 });
    }

    let seasons = data.MRData.SeasonTable.Seasons.map(s => s.season).reverse();
    
    // Remove current year if it's there
    const currentYear = new Date().getFullYear().toString();
    seasons = seasons.filter(s => s !== currentYear);

    return NextResponse.json(seasons);

  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
