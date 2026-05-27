"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './CircuitCard.module.css';

const getSectorData = (circuitId, sector) => {
  const data = {
    bahrain: {
      1: { maxSpeed: "315 km/h", minSpeed: "80 km/h", gear: "2nd", corner: "Turn 1 (Schumacher)" },
      2: { maxSpeed: "290 km/h", minSpeed: "65 km/h", gear: "1st", corner: "Turn 10 Hairpin" },
      3: { maxSpeed: "305 km/h", minSpeed: "135 km/h", gear: "4th", corner: "Turn 14 Entry" },
      drs: { zones: "3 DRS Zones", speedGain: "+12 km/h", advantage: "High slipstream overtaking on Main Straight" }
    },
    suzuka: {
      1: { maxSpeed: "295 km/h", minSpeed: "150 km/h", gear: "5th", corner: "First Corner & S-Curves" },
      2: { maxSpeed: "285 km/h", minSpeed: "75 km/h", gear: "2nd", corner: "Degner Curves & Hairpin" },
      3: { maxSpeed: "310 km/h", minSpeed: "265 km/h", gear: "8th", corner: "130R Flat Out" },
      drs: { zones: "1 DRS Zone", speedGain: "+10 km/h", advantage: "Pit Straight overtake drafting" }
    },
    monaco: {
      1: { maxSpeed: "280 km/h", minSpeed: "110 km/h", gear: "4th", corner: "Sainte Devote & Beau Rivage" },
      2: { maxSpeed: "210 km/h", minSpeed: "45 km/h", gear: "1st", corner: "Grand Hotel Hairpin" },
      3: { maxSpeed: "290 km/h", minSpeed: "95 km/h", gear: "3rd", corner: "Tabac & Swimming Pool" },
      drs: { zones: "1 DRS Zone", speedGain: "+6 km/h", advantage: "Extremely narrow passing window" }
    },
    spa: {
      1: { maxSpeed: "315 km/h", minSpeed: "290 km/h", gear: "7th", corner: "Eau Rouge & Radillon" },
      2: { maxSpeed: "280 km/h", minSpeed: "90 km/h", gear: "3rd", corner: "Pouhon Double-Apex" },
      3: { maxSpeed: "325 km/h", minSpeed: "85 km/h", gear: "2nd", corner: "Bus Stop Chicane" },
      drs: { zones: "2 DRS Zones", speedGain: "+14 km/h", advantage: "Kemmel Straight high-speed drafts" }
    },
    silverstone: {
      1: { maxSpeed: "305 km/h", minSpeed: "120 km/h", gear: "4th", corner: "Abbey & Arena Section" },
      2: { maxSpeed: "290 km/h", minSpeed: "245 km/h", gear: "7th", corner: "Copse, Maggots & Becketts" },
      3: { maxSpeed: "315 km/h", minSpeed: "110 km/h", gear: "3rd", corner: "Stowe & Club Corner" },
      drs: { zones: "2 DRS Zones", speedGain: "+11 km/h", advantage: "Wellington and Hangar Straight passes" }
    },
    monza: {
      1: { maxSpeed: "340 km/h", minSpeed: "75 km/h", gear: "1st", corner: "Prima Variante Chicane" },
      2: { maxSpeed: "320 km/h", minSpeed: "120 km/h", gear: "3rd", corner: "Variante Roggia & Lesmos" },
      3: { maxSpeed: "350 km/h", minSpeed: "215 km/h", gear: "6th", corner: "Variante Ascari & Parabolica" },
      drs: { zones: "2 DRS Zones", speedGain: "+15 km/h", advantage: "Slipstream drag races on Main Straight" }
    }
  };

  const fallback = {
    1: { maxSpeed: "300 km/h", minSpeed: "110 km/h", gear: "4th", corner: "Turn 3 Complex" },
    2: { maxSpeed: "285 km/h", minSpeed: "80 km/h", gear: "3rd", corner: "Mid-Track Hairpin" },
    3: { maxSpeed: "310 km/h", minSpeed: "130 km/h", gear: "5th", corner: "Final Corner Entry" },
    drs: { zones: "2 DRS Zones", speedGain: "+10 km/h", advantage: "Main Straight passing DRS window" }
  };

  return data[circuitId]?.[sector] || fallback[sector];
};

export default function CircuitCard({ circuitId, circuit, svgUrl }) {
  const [flipped, setFlipped] = useState(false);
  const [activeSector, setActiveSector] = useState(null); // null, 1, 2, 3, 'drs'
  const [showHud, setShowHud] = useState(false);
  const [svgPaths, setSvgPaths] = useState([]);
  const [viewBox, setViewBox] = useState("0 0 500 500");
  const [pathLength, setPathLength] = useState(1000);
  const pathRef = useRef(null);

  useEffect(() => {
    if (svgUrl) {
      fetch(svgUrl)
        .then(res => res.text())
        .then(text => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "image/svg+xml");
          const svgEl = doc.querySelector("svg");
          const paths = Array.from(doc.querySelectorAll("path")).map(p => p.getAttribute("d"));
          if (svgEl) {
            setViewBox(svgEl.getAttribute("viewBox") || "0 0 500 500");
          }
          setSvgPaths(paths);
        })
        .catch(err => console.error("Error parsing track SVG:", err));
    }
  }, [svgUrl]);

  useEffect(() => {
    if (pathRef.current) {
      try {
        setPathLength(pathRef.current.getTotalLength() || 1000);
      } catch (e) {
        // fallback
      }
    }
  }, [svgPaths]);

  const handleSectorClick = (e, sector) => {
    e.stopPropagation();
    if (activeSector === sector) {
      if (showHud) {
        setActiveSector(null);
        setShowHud(false);
      } else {
        setShowHud(true);
      }
    } else {
      setActiveSector(sector);
      setShowHud(true);
    }
  };

  const sectorInfo = activeSector ? getSectorData(circuitId, activeSector) : null;

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
            {svgPaths.length > 0 ? (
              <div className={styles.svgWrapper}>
                <svg viewBox={viewBox} className={styles.svgMap} fill="none">
                  {svgPaths.map((d, i) => (
                    <path 
                      key={i} 
                      d={d} 
                      ref={i === 0 ? pathRef : null} 
                      className={styles.trackBase} 
                    />
                  ))}
                  {activeSector && svgPaths.map((d, i) => {
                    if (i !== 0) return null; // Trace the main layout path
                    let strokeDasharray = "0 1000";
                    let strokeDashoffset = "0";
                    
                    if (activeSector === 1) {
                      strokeDasharray = `${pathLength / 3} ${pathLength}`;
                      strokeDashoffset = "0";
                    } else if (activeSector === 2) {
                      strokeDasharray = `${pathLength / 3} ${pathLength}`;
                      strokeDashoffset = `-${pathLength / 3}`;
                    } else if (activeSector === 3) {
                      strokeDasharray = `${pathLength / 3} ${pathLength}`;
                      strokeDashoffset = `-${(2 * pathLength) / 3}`;
                    } else if (activeSector === 'drs') {
                      strokeDasharray = `${pathLength * 0.12} ${pathLength * 0.73} ${pathLength * 0.12} ${pathLength}`;
                      strokeDashoffset = "0";
                    }
                    
                    return (
                      <path
                        key={`active-${i}`}
                        d={d}
                        className={`${styles.trackHighlight} ${
                          activeSector === 1 ? styles.highlightS1 :
                          activeSector === 2 ? styles.highlightS2 :
                          activeSector === 3 ? styles.highlightS3 :
                          activeSector === 'drs' ? styles.highlightDrs : ''
                        }`}
                        style={{
                          strokeDasharray: strokeDasharray,
                          strokeDashoffset: strokeDashoffset,
                        }}
                      />
                    );
                  })}
                </svg>
                
                {/* Telemetry HUD Panel */}
                {activeSector && showHud && sectorInfo && (
                  <div className={styles.hudOverlay} onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={styles.hudClose} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHud(false);
                      }}
                      title="Close Telemetry"
                    >
                      &times;
                    </button>
                    {activeSector === 'drs' ? (
                      <div>
                        <div className={styles.hudTitle} style={{ color: '#39ff14' }}>DRS Activated</div>
                        <div className={styles.hudRow}>
                          <span>Speed Gain:</span> <strong>{sectorInfo.speedGain}</strong>
                        </div>
                        <div className={styles.hudRow}>
                          <span>Advantage:</span> <span className={styles.hudText}>{sectorInfo.advantage}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={styles.hudTitle} style={{ 
                          color: activeSector === 1 ? '#00f0ff' : activeSector === 2 ? '#ffe600' : '#ff007f' 
                        }}>
                          Sector {activeSector} Telemetry
                        </div>
                        <div className={styles.hudGrid}>
                          <div className={styles.hudItem}>
                            <span>Max Speed:</span> <strong>{sectorInfo.maxSpeed}</strong>
                          </div>
                          <div className={styles.hudItem}>
                            <span>Gear:</span> <strong>{sectorInfo.gear}</strong>
                          </div>
                          <div className={styles.hudItem} style={{ gridColumn: 'span 2' }}>
                            <span>Key Corner:</span> <strong>{sectorInfo.corner}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : svgUrl ? (
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
            
            {/* Interactive Sector pills selector */}
            <div className={styles.sectorSelector} onClick={(e) => e.stopPropagation()}>
              <button 
                className={`${styles.sectorPill} ${activeSector === 1 ? styles.activeS1 : ''}`}
                onClick={(e) => handleSectorClick(e, 1)}
              >
                S1
              </button>
              <button 
                className={`${styles.sectorPill} ${activeSector === 2 ? styles.activeS2 : ''}`}
                onClick={(e) => handleSectorClick(e, 2)}
              >
                S2
              </button>
              <button 
                className={`${styles.sectorPill} ${activeSector === 3 ? styles.activeS3 : ''}`}
                onClick={(e) => handleSectorClick(e, 3)}
              >
                S3
              </button>
              <button 
                className={`${styles.sectorPill} ${activeSector === 'drs' ? styles.activeDrs : ''}`}
                onClick={(e) => handleSectorClick(e, 'drs')}
              >
                DRS
              </button>
            </div>
 
             <div className={styles.flipHint}>Click card to flip <span>&rarr;</span></div>
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
