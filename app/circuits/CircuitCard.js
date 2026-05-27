"use client";
import React, { useState } from 'react';
import styles from './CircuitCard.module.css';

export default function CircuitCard({ circuitId, circuit, svgUrl }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      className={styles.cardContainer} 
      onClick={() => setFlipped(!flipped)}
      style={{ '--circuit-color': circuit.color || 'var(--f1-red)' }}
    >
      <div className={`${styles.cardInner} ${flipped ? styles.isFlipped : ''}`}>
        
        {/* Front Face */}
        <div className={styles.cardFront}>
          <div className={styles.mapContainer}>
            {svgUrl ? (
              <img src={svgUrl} alt={circuit.name} className={styles.svgMap} />
            ) : (
              <div className={styles.noMap}>Map Unavailable</div>
            )}
          </div>
          <div className={styles.cardInfo}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.circuitName}>{circuit.name}</h2>
                <p className={styles.location}>
                  {circuit.locality}, {circuit.country}
                </p>
              </div>
            </div>
            <div className={styles.flipHint}>Click to flip <span>&rarr;</span></div>
          </div>
        </div>

        {/* Back Face */}
        <div className={styles.cardBack}>
          {svgUrl && <img src={svgUrl} alt="" className={styles.watermarkMap} />}
          <div className={styles.backContent}>
            <h2 className={styles.circuitNameBack}>{circuit.name}</h2>
            <p className={styles.locationBack}>{circuit.locality}, {circuit.country}</p>
            
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Length</span>
                <span className={styles.statValue}>{circuit.length || 'N/A'}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Laps</span>
                <span className={styles.statValue}>{circuit.laps || 'N/A'}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Lap Record</span>
                <span className={styles.statValue}>{circuit.record || 'N/A'}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Quali Record</span>
                <span className={styles.statValue}>{circuit.qualiRecord || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.flipHintBack}>Click to return <span>&larr;</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
