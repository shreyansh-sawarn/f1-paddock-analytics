"use client";
import React, { useState } from 'react';
import styles from './ResultCard.module.css';
import { circuitData } from '@/lib/circuitData';

export default function ResultCard({ race }) {
  const [expanded, setExpanded] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('race'); // 'race', 'qualifying', 'sprint'
  
  const circuit = circuitData[race.Circuit.circuitId] || { 
    color: "rgba(50, 50, 50, 1)", 
    image: "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=800" 
  };
  
  const baseColor = circuit.color;
  const fadedColor = baseColor.replace('1)', '0.85)');
  const transparentColor = baseColor.replace('1)', '0)');
  
  const cardStyle = {
    backgroundImage: `linear-gradient(90deg, ${baseColor} 0%, ${fadedColor} 50%, ${transparentColor} 100%), url('${circuit.image}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat'
  };

  const initialResults = race.Results || [];
  const podium = initialResults.slice(0, 3);

  const handleExpand = async () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    if (newExpanded && !sessionData) {
      setLoading(true);
      try {
        const res = await fetch(`/api/archive/${race.season}/${race.round}`);
        if (!res.ok) throw new Error('Failed to fetch session data');
        const data = await res.json();
        setSessionData(data);
        if (!data.results?.length && data.sprint?.length) {
           setActiveTab('sprint');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const renderTable = (data, isQuali = false) => {
    if (!data || data.length === 0) return <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>No data available for this session.</div>;
    
    return (
      <div className={styles.fullResults}>
        <div className={styles.tableHeader}>
          <span className={styles.colPos}>Pos</span>
          <span className={styles.colDriver}>Driver</span>
          <span className={styles.colTeam}>Team</span>
          <span className={styles.colTime}>{isQuali ? 'Q3 / Q2 / Q1' : 'Time/Ret'}</span>
          {!isQuali && <span className={styles.colPts}>Pts</span>}
        </div>
        {data.map((driver) => (
          <div key={driver.position || driver.number} className={styles.tableRow}>
            <span className={styles.colPos}>{driver.positionText || driver.position}</span>
            <span className={styles.colDriver}>{driver.Driver.givenName} <strong>{driver.Driver.familyName}</strong></span>
            <span className={styles.colTeam}>{driver.Constructor.name}</span>
            <span className={styles.colTime}>
              {isQuali ? (driver.Q3 || driver.Q2 || driver.Q1 || '-') : (driver.Time ? driver.Time.time : driver.status)}
            </span>
            {!isQuali && <span className={styles.colPts}>{driver.points || '0'}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.card}>
      <div className={styles.header} style={cardStyle} onClick={handleExpand}>
        <div className={styles.titleInfo}>
          <div className={styles.round}>Round {race.round}</div>
          <h2 className={styles.raceName}>{race.raceName}</h2>
          <p className={styles.circuit}>{race.Circuit.circuitName}</p>
        </div>
        
        {podium.length > 0 && (
          <div className={styles.podiumPreview}>
            {podium.map(driver => (
              <div key={driver.position} className={`${styles.podiumItem} ${styles['p' + driver.position]}`}>
                <div className={styles.posBadge}>P{driver.position}</div>
                <div className={styles.driverInfo}>
                  <span className={styles.driverName}>{driver.Driver.givenName} <strong>{driver.Driver.familyName}</strong></span>
                  <span className={styles.constructor}>{driver.Constructor.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.toggleBar} onClick={handleExpand}>
        <span>{expanded ? 'Hide Classification' : 'Show Full Classification & Sessions'}</span>
        <span className={styles.toggleIcon}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className={styles.expandedContent}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading session data...</div>
          ) : sessionData ? (
            <>
              <div className={styles.tabs}>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'race' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('race')}
                >
                  Race
                </button>
                {sessionData.sprint?.length > 0 && (
                  <button 
                    className={`${styles.tabBtn} ${activeTab === 'sprint' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('sprint')}
                  >
                    Sprint
                  </button>
                )}
                {sessionData.qualifying?.length > 0 && (
                  <button 
                    className={`${styles.tabBtn} ${activeTab === 'qualifying' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('qualifying')}
                  >
                    Qualifying
                  </button>
                )}
                {sessionData.sprintQualifying?.length > 0 && (
                  <button 
                    className={`${styles.tabBtn} ${activeTab === 'sprintQuali' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('sprintQuali')}
                  >
                    Sprint Quali
                  </button>
                )}
              </div>
              
              <div className={styles.tabContent}>
                {activeTab === 'race' && renderTable(sessionData.results || initialResults, false)}
                {activeTab === 'sprint' && renderTable(sessionData.sprint, false)}
                {activeTab === 'qualifying' && renderTable(sessionData.qualifying, true)}
                {activeTab === 'sprintQuali' && renderTable(sessionData.sprintQualifying, true)}
              </div>
            </>
          ) : (
            renderTable(initialResults, false)
          )}
        </div>
      )}
    </div>
  );
}
