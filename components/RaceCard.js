"use client";
import React, { useState, useEffect } from 'react';
import styles from './RaceCard.module.css';
import Countdown from './Countdown';
import AnalogClock from './AnalogClock';
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
    // Client-side timezone formatting (always local timezone)
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

    const formatTimeObj = (dateStr, timeStr) => {
      if (!timeStr) return null;
      return new Date(`${dateStr}T${timeStr}`);
    };

    const s = [];
    const addSession = (name, dateStr, timeStr, isMain = false) => {
      s.push({
        name,
        formattedTime: formatTime(dateStr, timeStr),
        rawTime: formatTimeObj(dateStr, timeStr),
        isMain
      });
    };

    if (race.FirstPractice) addSession('Free Practice 1', race.FirstPractice.date, race.FirstPractice.time);
    if (race.SecondPractice) addSession('Free Practice 2', race.SecondPractice.date, race.SecondPractice.time);
    if (race.ThirdPractice) addSession('Free Practice 3', race.ThirdPractice.date, race.ThirdPractice.time);
    if (race.SprintQualifying) addSession('Sprint Qualifying', race.SprintQualifying.date, race.SprintQualifying.time);
    if (race.Sprint) addSession('Sprint', race.Sprint.date, race.Sprint.time);
    if (race.Qualifying) addSession('Qualifying', race.Qualifying.date, race.Qualifying.time);
    addSession('Race', race.date, race.time, true);
    
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
              <div className={styles.sessionTimeContainer}>
                {session.rawTime && (
                  <AnalogClock time={session.rawTime} />
                )}
                <span className={styles.sessionTime}>{session.formattedTime}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
