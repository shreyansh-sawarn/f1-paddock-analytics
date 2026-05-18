"use client";
import React, { useState, useEffect } from 'react';
import styles from './Countdown.module.css';

export default function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className={styles.countdown}>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{timeLeft.days}</span>
        <span className={styles.label}>Days</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{timeLeft.hours}</span>
        <span className={styles.label}>Hours</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{timeLeft.minutes}</span>
        <span className={styles.label}>Minutes</span>
      </div>
      <div className={styles.timeBlock}>
        <span className={styles.number}>{timeLeft.seconds}</span>
        <span className={styles.label}>Seconds</span>
      </div>
    </div>
  );
}
