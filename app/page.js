"use client";
import React, { useState, useEffect } from 'react';
import RaceCard from '@/components/RaceCard';

export default function Home() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch('/api/schedule');
        if (!res.ok) throw new Error('Failed to fetch schedule');
        const data = await res.json();
        setSchedule(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading F1 Schedule...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--f1-red)', fontWeight: 'bold' }}>Error: {error}</div>;
  }

  // Filter out past races
  const now = new Date();
  const upcomingRaces = schedule.filter(race => {
    const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
    return raceDate > now;
  });

  // The first race in the filtered list is the next upcoming race
  const nextRaceIndex = upcomingRaces.length > 0 ? 0 : -1;

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--f1-dark)' }}>Formula 1 Schedule</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Real-time updates dynamically converted to your local timezone.</p>
      </header>
      
      <div className="race-list">
        {upcomingRaces.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No upcoming races found.</div>
        ) : (
          upcomingRaces.map((race, idx) => (
            <RaceCard 
              key={race.round} 
              race={race} 
              isNext={idx === nextRaceIndex} 
            />
          ))
        )}
      </div>
    </div>
  );
}
