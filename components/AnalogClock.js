"use client";
import React from 'react';
import styles from './AnalogClock.module.css';

export default function AnalogClock({ time, timeZone }) {
  if (!time) return null;

  let hours = 0;
  let minutes = 0;

  if (time instanceof Date) {
    if (timeZone) {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        }).formatToParts(time);
        
        const hPart = parts.find(p => p.type === 'hour');
        const mPart = parts.find(p => p.type === 'minute');
        hours = hPart ? parseInt(hPart.value, 10) : time.getHours();
        minutes = mPart ? parseInt(mPart.value, 10) : time.getMinutes();
      } catch (err) {
        console.error('Error formatting clock timeZone:', err);
        hours = time.getHours();
        minutes = time.getMinutes();
      }
    } else {
      hours = time.getHours();
      minutes = time.getMinutes();
    }
  } else if (typeof time === 'string') {
    const match = time.match(/(\d+):(\d+)/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      
      if (time.toLowerCase().includes('pm') && hours < 12) {
        hours += 12;
      }
      if (time.toLowerCase().includes('am') && hours === 12) {
        hours = 0;
      }
    }
  }

  // Calculate rotations (degrees)
  const hourRotation = ((hours % 12) * 30) + (minutes * 0.5);
  const minuteRotation = minutes * 6;

  return (
    <div className={styles.clock} aria-label={`Clock showing ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}>
      <div className={styles.clockFace}>
        <div 
          className={`${styles.hand} ${styles.hour}`} 
          style={{ transform: `rotate(${hourRotation}deg)` }}
        />
        <div 
          className={`${styles.hand} ${styles.minute}`} 
          style={{ transform: `rotate(${minuteRotation}deg)` }}
        />
        <div className={styles.centerPin} />
      </div>
    </div>
  );
}
