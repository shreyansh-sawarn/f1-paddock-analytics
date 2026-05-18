"use client";
import React, { useState, useEffect } from 'react';
import styles from './RaceCard.module.css';
import Countdown from './Countdown';
import { circuitData } from '@/lib/circuitData';

export default function RaceCard({ race, isNext }) {
  const [expanded, setExpanded] = useState(isNext);
  const [sessions, setSessions] = useState([]);

  const circuit = circuitData[race.Circuit.circuitId] || { 
    color: "rgba(50, 50, 50, 1)", 
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=800" 
  };
  
  const baseColor = isNext ? "rgba(225, 6, 0, 1)" : circuit.color;

  
  useEffect(() => {
    // Client-side timezone formatting
    const formatTime = (dateStr, timeStr) => {
      if (!timeStr) return 'TBD';
      const date = new Date(`${dateStr}T${timeStr}`);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    };

    const s = [];
    if (race.FirstPractice) s.push({ name: 'Free Practice 1', time: formatTime(race.FirstPractice.date, race.FirstPractice.time) });
    if (race.SecondPractice) s.push({ name: 'Free Practice 2', time: formatTime(race.SecondPractice.date, race.SecondPractice.time) });
    if (race.ThirdPractice) s.push({ name: 'Free Practice 3', time: formatTime(race.ThirdPractice.date, race.ThirdPractice.time) });
    if (race.SprintQualifying) s.push({ name: 'Sprint Quali', time: formatTime(race.SprintQualifying.date, race.SprintQualifying.time) });
    if (race.Sprint) s.push({ name: 'Sprint', time: formatTime(race.Sprint.date, race.Sprint.time) });
    if (race.Qualifying) s.push({ name: 'Qualifying', time: formatTime(race.Qualifying.date, race.Qualifying.time) });
    s.push({ name: 'Race', time: formatTime(race.date, race.time), isMain: true });
    
    setSessions(s);
  }, [race]);

  const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
  const isPast = raceDate < new Date();

  const cardClass = `${styles.card} ${isNext ? styles.nextRace : ''} ${isPast ? styles.pastRace : ''}`;

  const fadedColor = baseColor.replace('1)', '0.85)');
  const transparentColor = baseColor.replace('1)', '0)');
  
  const cardStyle = {
    backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${fadedColor} 50%, ${transparentColor} 100%), url('${circuit.image}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className={cardClass} style={cardStyle}>
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.titleInfo}>
          <div className={styles.round}>Round {race.round}</div>
          <h2 className={styles.raceName}>{race.raceName}</h2>
          <p className={styles.circuit}>{race.Circuit.circuitName}</p>
        </div>
        
        {isNext && (
          <div className={styles.countdownContainer}>
            <Countdown targetDate={raceDate} />
          </div>
        )}
      </div>

      <div className={styles.toggleBar} onClick={() => setExpanded(!expanded)}>
        <span>{sessions.length} Sessions</span>
        <span className={styles.toggleIcon}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.sessionsList}>
          {sessions.map((session, idx) => (
            <div key={idx} className={`${styles.sessionItem} ${session.isMain ? styles.mainSession : ''}`}>
              <span className={styles.sessionName}>{session.name}</span>
              <span className={styles.sessionTime}>{session.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
