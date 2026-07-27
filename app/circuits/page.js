"use client";
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { getCircuitMap } from '@/lib/circuitMaps';
import { circuitData } from '@/lib/circuitData';
import CircuitCard from './CircuitCard';

// Mirrors the race-week detection used in RaceCard.js: a race's "week" starts
// on the Monday of the race weekend. Once we've hit that Monday, the circuit
// is considered "live" for the weekend rather than merely "next up".
function getRaceWeekStatus(race, now) {
  const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
  const raceEnd = new Date(raceDate.getTime() + 3 * 60 * 60 * 1000);

  const day = raceDate.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const raceWeekMonday = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate() + offset);
  const mondayMidnight = new Date(raceWeekMonday.getFullYear(), raceWeekMonday.getMonth(), raceWeekMonday.getDate());

  return {
    raceDate,
    raceEnd,
    isLiveWeekend: now >= mondayMidnight && now <= raceEnd
  };
}

export default function CircuitsPage() {
  const [featuredRace, setFeaturedRace] = useState(null);
  const [isLiveWeekend, setIsLiveWeekend] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => {
        if (cancelled || !Array.isArray(data)) return;
        const now = new Date();

        // Find the next race whose weekend hasn't finished yet.
        const upcoming = data.find(race => {
          const { raceEnd } = getRaceWeekStatus(race, now);
          return raceEnd > now;
        });

        if (upcoming) {
          const { isLiveWeekend: live } = getRaceWeekStatus(upcoming, now);
          setFeaturedRace(upcoming);
          setIsLiveWeekend(live);
        }
      })
      .catch(err => console.error('Error fetching schedule for featured circuit:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredCircuitId = featuredRace?.Circuit?.circuitId;

  const circuits = Object.entries(circuitData).map(([id, data]) => ({
    circuitId: id,
    ...data
  }));

  // Pin the featured circuit to the front without otherwise reordering the list.
  const orderedCircuits = featuredCircuitId
    ? [
        ...circuits.filter(c => c.circuitId === featuredCircuitId),
        ...circuits.filter(c => c.circuitId !== featuredCircuitId)
      ]
    : circuits;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Track Maps</h1>
          <p className={styles.subtitle}>Explore official SVG layouts and statistics for circuits past and present.</p>
        </div>
      </header>

      <div className={styles.grid}>
        {orderedCircuits.map(circuit => {
          const svgUrl = getCircuitMap(circuit.circuitId);
          const isFeatured = circuit.circuitId === featuredCircuitId;
          return (
            <CircuitCard
              key={circuit.circuitId}
              circuitId={circuit.circuitId}
              circuit={circuit}
              svgUrl={svgUrl}
              isFeatured={isFeatured}
              raceInfo={isFeatured ? featuredRace : null}
              isLiveWeekend={isFeatured ? isLiveWeekend : false}
            />
          );
        })}
      </div>
    </div>
  );
}
