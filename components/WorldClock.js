"use client";
import React, { useState, useEffect } from 'react';
import styles from './WorldClock.module.css';

export default function WorldClock({ trackTimezone, trackName }) {
  const [activeMode, setActiveMode] = useState('local'); // 'local' or 'track'
  const [time, setTime] = useState(null);

  // Initialize time on client-side to prevent hydration mismatch
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    // SSR placeholder to match server structure
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.timeSelector}>
          <div className={`${styles.timeRow} ${styles.active}`}>
            <span className={styles.dot}></span>
            <span className={styles.label}>MY TIME</span>
            <span className={styles.value}>--:--</span>
          </div>
          <div className={styles.timeRow}>
            <span className={styles.dot}></span>
            <span className={styles.label}>TRACK TIME</span>
            <span className={styles.value}>--:--</span>
          </div>
        </div>
        <div className={styles.clockContainer}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }}></div>
        </div>
      </div>
    );
  }

  // Format local time
  const formatTime = (date, tz) => {
    try {
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      if (tz) options.timeZone = tz;
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch {
      return '00:00';
    }
  };

  const localTimeStr = formatTime(time);
  const trackTimeStr = formatTime(time, trackTimezone);

  // Extract hours, minutes, seconds for hands rotation
  const getHandRotations = () => {
    let targetDate = time;
    if (activeMode === 'track' && trackTimezone) {
      try {
        const trackStr = time.toLocaleString('en-US', { timeZone: trackTimezone });
        targetDate = new Date(trackStr);
      } catch (err) {
        console.error(err);
      }
    }

    const hrs = targetDate.getHours();
    const mins = targetDate.getMinutes();
    const secs = targetDate.getSeconds();

    const hrRotation = ((hrs % 12) * 30) + (mins * 0.5);
    const minRotation = (mins * 6) + (secs * 0.1);
    const secRotation = secs * 6;

    return { hrRotation, minRotation, secRotation };
  };

  const { hrRotation, minRotation, secRotation } = getHandRotations();

  return (
    <div className={styles.widgetContainer}>
      <div className={styles.timeSelector}>
        {/* MY TIME Row */}
        <div 
          className={`${styles.timeRow} ${activeMode === 'local' ? styles.active : ''}`}
          onClick={() => setActiveMode('local')}
        >
          <span className={styles.dot}></span>
          <span className={styles.label}>MY TIME</span>
          <span className={styles.value}>{localTimeStr}</span>
        </div>

        {/* TRACK TIME Row */}
        <div 
          className={`${styles.timeRow} ${activeMode === 'track' ? styles.active : ''}`}
          onClick={() => setActiveMode('track')}
        >
          <span className={styles.dot}></span>
          <span className={styles.label}>TRACK TIME</span>
          <span className={styles.value}>{trackTimeStr}</span>
        </div>
        
        {trackName && activeMode === 'track' && (
          <div className={styles.trackName}>{trackName}</div>
        )}
      </div>

      {/* Analog Clock (Race Watch Style) */}
      <div className={styles.clockContainer}>
        <svg className={styles.analogClock} viewBox="0 0 100 100">
          {/* Bezel */}
          <circle cx="50" cy="50" r="46" className={styles.bezel} />
          
          {/* Bezel Markings */}
          <g className={styles.bezelMarkings}>
            <text x="50" y="11" className={styles.bezelText}>TACHYMETRE</text>
            <path d="M 50 4 L 50 8" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M 73 13 L 71 16" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 87 27 L 84 29" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 96 50 L 92 50" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M 87 73 L 84 71" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 73 87 L 71 84" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 50 96 L 50 92" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M 27 87 L 29 84" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 13 73 L 16 71" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 4 50 L 8 50" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M 13 27 L 16 29" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 27 13 L 29 16" stroke="#ffffff" strokeWidth="0.8" />
          </g>

          {/* Dial Face */}
          <circle cx="50" cy="50" r="38" className={styles.dialFace} />
          
          {/* Dial Markings */}
          <g stroke="var(--clock-face-text)" strokeWidth="0.6">
            <line x1="50" y1="16" x2="50" y2="20" strokeWidth="1.5" />
            <line x1="67" y1="20.5" x2="65" y2="24" />
            <line x1="80" y1="33" x2="76.5" y2="36.5" />
            <line x1="84" y1="50" x2="80" y2="50" strokeWidth="1.5" />
            <line x1="80" y1="67" x2="76.5" y2="63.5" />
            <line x1="67" y1="79.5" x2="65" y2="76" />
            <line x1="50" y1="84" x2="50" y2="80" strokeWidth="1.5" />
            <line x1="33" y1="79.5" x2="35" y2="76" />
            <line x1="20" y1="67" x2="23.5" y2="63.5" />
            <line x1="16" y1="50" x2="20" y2="50" strokeWidth="1.5" />
            <line x1="20" y1="33" x2="23.5" y2="36.5" />
            <line x1="33" y1="20.5" x2="35" y2="24" />
          </g>

          {/* Hour Numbers */}
          <text x="50" y="27" className={styles.dialNumber}>12</text>
          <text x="75" y="52" className={styles.dialNumber}>3</text>
          <text x="50" y="77" className={styles.dialNumber}>6</text>
          <text x="25" y="52" className={styles.dialNumber}>9</text>
          
          <text x="50" y="41" className={styles.brandText}>PADDOCK</text>
          <text x="50" y="63" className={styles.brandSubtitle}>FORMULA 1</text>

          {/* Hands */}
          {/* Hour Hand */}
          <g transform={`rotate(${hrRotation} 50 50)`}>
            <line x1="50" y1="50" x2="50" y2="31" className={styles.hourHand} />
          </g>
          {/* Minute Hand */}
          <g transform={`rotate(${minRotation} 50 50)`}>
            <line x1="50" y1="50" x2="50" y2="20" className={styles.minuteHand} />
          </g>
          {/* Second Hand */}
          <g transform={`rotate(${secRotation} 50 50)`}>
            <line x1="50" y1="50" x2="50" y2="16" className={styles.secondHand} />
          </g>
          
          {/* Center Pin */}
          <circle cx="50" cy="50" r="3.5" className={styles.pinCap} />
          <circle cx="50" cy="50" r="1" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}
