"use client";
import React, { useState, useEffect } from 'react';
import RaceCard from '@/components/RaceCard';
import WorldClock from '@/components/WorldClock';
import { circuitData } from '@/lib/circuitData';
import styles from './page.module.css';

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
    return <div className={styles.loading}>Loading F1 Schedule...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  const now = new Date();
  const upcomingRaces = schedule.filter(race => {
    const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
    return raceDate > now;
  });

  const nextRaceIndex = upcomingRaces.length > 0 ? 0 : -1;
  const nextRace = upcomingRaces.length > 0 ? upcomingRaces[0] : null;
  const nextRaceTimezone = nextRace ? (circuitData[nextRace.Circuit.circuitId]?.timezone || 'UTC') : null;
  const nextRaceName = nextRace ? nextRace.Circuit.circuitName : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Formula 1 Schedule</h1>
          <p className={styles.subtitle}>Real-time updates dynamically converted to your timezone.</p>
        </div>
        
        {/* World Clock Widget */}
        {nextRaceTimezone && (
          <WorldClock 
            trackTimezone={nextRaceTimezone} 
            trackName={nextRaceName} 
          />
        )}
      </header>
      
      <div className="race-list">
        {upcomingRaces.length === 0 ? (
          <div className={styles.noRaces}>No upcoming races found.</div>
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
