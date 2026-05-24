"use client";
import React, { useState, useEffect } from 'react';
import styles from './RaceCard.module.css';
import Countdown from './Countdown';
import AnalogClock from './AnalogClock';
import Image from 'next/image';
import { circuitData } from '@/lib/circuitData';

export default function RaceCard({ race, isNext }) {
  const [expanded, setExpanded] = useState(isNext);
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setExpanded(isNext);
  }, [isNext]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNow(new Date());
    }, 0);
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update once every 60 seconds
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const getSessionState = (name, rawTime) => {
    if (!now || !rawTime) return 'future';
    
    const startTime = new Date(rawTime);
    const lowerName = name.toLowerCase();
    
    let durationMs = 1 * 60 * 60 * 1000; // Default: 1 hour (Practice sessions)
    
    if (lowerName.includes('qualifying') || lowerName.includes('sprint')) {
      durationMs = 1.5 * 60 * 60 * 1000; // 1.5 hours
    } else if (lowerName === 'race') {
      durationMs = 3 * 60 * 60 * 1000; // 3 hours (Main race maximum absolute limit)
    }
    
    const endTime = new Date(startTime.getTime() + durationMs);
    
    if (now > endTime) {
      return 'completed';
    } else if (now >= startTime && now <= endTime) {
      return 'live';
    } else {
      return 'future';
    }
  };

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
    
    const timeout = setTimeout(() => {
      setSessions(s);
    }, 0);
    return () => clearTimeout(timeout);
  }, [race]);

  const raceDate = new Date(`${race.date}T${race.time || '00:00:00Z'}`);
  const raceEndTime = new Date(raceDate.getTime() + 3 * 60 * 60 * 1000);
  const isPast = raceEndTime < new Date();

  const cardClass = `${styles.card} ${isNext ? styles.nextRace : ''} ${isPast ? styles.pastRace : ''}`;

  const fadedColor = baseColor.replace('1)', '0.85)');
  const transparentColor = baseColor.replace('1)', '0)');
  
  const cardStyle = {
    backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${fadedColor} 50%, ${transparentColor} 100%), url('${circuit.image}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat',
    position: 'relative' // Ensure relative positioning for absolute children
  };

  return (
    <div className={cardClass} style={cardStyle}>
      <div className={styles.cardInner}>
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
          {sessions.map((session, idx) => {
            const state = getSessionState(session.name, session.rawTime);
            const isCompleted = state === 'completed';
            const isLive = state === 'live';
            
            return (
              <div 
                key={idx} 
                className={`${styles.sessionItem} ${session.isMain ? styles.mainSession : ''} ${isCompleted ? styles.completedSession : ''} ${isLive ? styles.liveSession : ''}`}
              >
                <div className={styles.sessionNameContainer}>
                  <span className={styles.sessionName}>{session.name}</span>
                  {isLive && (
                    <span className={styles.liveBadge}>
                      Live
                      <span className={styles.liveDot}></span>
                    </span>
                  )}
                </div>
                <div className={styles.sessionTimeContainer}>
                  {session.rawTime && (
                    <AnalogClock time={session.rawTime} />
                  )}
                  <span className={styles.sessionTime}>{session.formattedTime}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
