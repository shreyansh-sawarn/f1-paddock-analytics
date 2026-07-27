"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './CircuitCard.module.css';

// DRS was retired for 2026, replaced by "Active Aero". We used to track its
// Straight Mode zones here (the open-to-everyone drag-reduction zones), but
// dropped that: the FIA can add/shorten/drop a circuit's zone count race to
// race, so keeping it accurate meant re-verifying a number every single race
// weekend all season. Overtake Mode - the actual DRS-like overtaking aid - is
// a much better fit for a mostly-static dashboard: its mechanic (one
// gap-gated detection point per lap, +0.5MJ of extra deployable energy usable
// anywhere on the next lap) is fixed by the regulations and doesn't change
// circuit to circuit or week to week. Only the "flavor" text below is
// per-circuit, and it's based on stable, well-known circuit layout facts
// (which straight is the long/famous one) rather than anything that needs
// re-checking each race weekend - if a circuit's specific straight isn't
// well known, use OVERTAKE_FALLBACK_FLAVOR instead of guessing.
const OVERTAKE_MODE_MECHANIC = "One gap-gated detection point per lap — stay within 1s to bank +0.5MJ of extra deployable energy, usable anywhere on the next lap";

const OVERTAKE_FALLBACK_FLAVOR = "Drivers choose whether to spend the extra energy in one go or spread it across the lap";

const getSectorData = (circuitId, sector) => {
  const data = {
    bahrain: {
      1: { maxSpeed: "315 km/h", minSpeed: "80 km/h", gear: "2nd", corner: "Turn 1 (Schumacher)" },
      2: { maxSpeed: "290 km/h", minSpeed: "65 km/h", gear: "1st", corner: "Turn 10 Hairpin" },
      3: { maxSpeed: "305 km/h", minSpeed: "135 km/h", gear: "4th", corner: "Turn 14 Entry" },
      overtake: { flavor: "Often cashed in down the long Main Straight into Turn 1" }
    },
    suzuka: {
      1: { maxSpeed: "295 km/h", minSpeed: "150 km/h", gear: "5th", corner: "First Corner & S-Curves" },
      2: { maxSpeed: "285 km/h", minSpeed: "75 km/h", gear: "2nd", corner: "Degner Curves & Hairpin" },
      3: { maxSpeed: "310 km/h", minSpeed: "265 km/h", gear: "8th", corner: "130R Flat Out" },
      overtake: { flavor: "Classic spot for it is the Pit Straight sprint into Turn 1" }
    },
    monaco: {
      1: { maxSpeed: "280 km/h", minSpeed: "110 km/h", gear: "4th", corner: "Sainte Devote & Beau Rivage" },
      2: { maxSpeed: "210 km/h", minSpeed: "45 km/h", gear: "1st", corner: "Grand Hotel Hairpin" },
      3: { maxSpeed: "290 km/h", minSpeed: "95 km/h", gear: "3rd", corner: "Tabac & Swimming Pool" },
      overtake: { flavor: "Short straights mean drivers often spread the energy across the lap instead" }
    },
    spa: {
      1: { maxSpeed: "315 km/h", minSpeed: "290 km/h", gear: "7th", corner: "Eau Rouge & Radillon" },
      2: { maxSpeed: "280 km/h", minSpeed: "90 km/h", gear: "3rd", corner: "Pouhon Double-Apex" },
      3: { maxSpeed: "325 km/h", minSpeed: "85 km/h", gear: "2nd", corner: "Bus Stop Chicane" },
      overtake: { flavor: "Kemmel Straight is where the extra energy pays off most" }
    },
    silverstone: {
      1: { maxSpeed: "305 km/h", minSpeed: "120 km/h", gear: "4th", corner: "Abbey & Arena Section" },
      2: { maxSpeed: "290 km/h", minSpeed: "245 km/h", gear: "7th", corner: "Copse, Maggots & Becketts" },
      3: { maxSpeed: "315 km/h", minSpeed: "110 km/h", gear: "3rd", corner: "Stowe & Club Corner" },
      overtake: { flavor: "Hangar Straight is the prime spot to use it" }
    },
    monza: {
      1: { maxSpeed: "340 km/h", minSpeed: "75 km/h", gear: "1st", corner: "Prima Variante Chicane" },
      2: { maxSpeed: "320 km/h", minSpeed: "120 km/h", gear: "3rd", corner: "Variante Roggia & Lesmos" },
      3: { maxSpeed: "350 km/h", minSpeed: "215 km/h", gear: "6th", corner: "Variante Ascari & Parabolica" },
      overtake: { flavor: "F1's fastest straights make this the best track all year to cash it in" }
    }
  };

  const fallback = {
    1: { maxSpeed: "300 km/h", minSpeed: "110 km/h", gear: "4th", corner: "Turn 3 Complex" },
    2: { maxSpeed: "285 km/h", minSpeed: "80 km/h", gear: "3rd", corner: "Mid-Track Hairpin" },
    3: { maxSpeed: "310 km/h", minSpeed: "130 km/h", gear: "5th", corner: "Final Corner Entry" },
    overtake: { flavor: OVERTAKE_FALLBACK_FLAVOR }
  };

  return data[circuitId]?.[sector] || fallback[sector];
};

export default function CircuitCard({ circuitId, circuit, svgUrl, isFeatured = false, raceInfo = null, isLiveWeekend = false }) {
  const [flipped, setFlipped] = useState(false);
  const [activeSector, setActiveSector] = useState(null); // null, 1, 2, 3, 'overtake'
  const [showHud, setShowHud] = useState(false);
  const [svgPaths, setSvgPaths] = useState([]);
  const [viewBox, setViewBox] = useState("0 0 500 500");
  const [pathLength, setPathLength] = useState(1000);
  const pathRef = useRef(null);

  // Lap Simulator State
  const [isPlayingLap, setIsPlayingLap] = useState(false);
  const [lapProgress, setLapProgress] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [carPos, setCarPos] = useState(null);

  // Compact "next race" countdown for the featured banner (d/h/m only — no
  // seconds ticker, since this is a small badge rather than a hero clock).
  const [countdownText, setCountdownText] = useState(null);

  useEffect(() => {
    if (!isFeatured || !raceInfo || isLiveWeekend) {
      setCountdownText(null);
      return;
    }

    const target = new Date(`${raceInfo.date}T${raceInfo.time || '00:00:00Z'}`).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdownText('Starting now');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownText(days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`);
    };

    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [isFeatured, raceInfo, isLiveWeekend]);

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

  // Lap Animation Loop
  useEffect(() => {
    if (!isPlayingLap || !pathRef.current || pathLength <= 0) {
      setCarPos(null);
      setCurrentSpeed(0);
      return;
    }

    let animationFrameId;
    let progress = 0;
    let speed = 160; // Initial speed in km/h

    const updateFrame = () => {
      if (!pathRef.current) return;

      try {
        const path = pathRef.current;
        const totalLen = path.getTotalLength() || pathLength;

        if (progress >= totalLen) {
          setIsPlayingLap(false);
          setCarPos(null);
          setCurrentSpeed(0);
          return;
        }

        // 1. Get position coordinate
        const pt = path.getPointAtLength(progress);
        setCarPos({ x: pt.x, y: pt.y });

        // 2. Curvature estimation
        const delta = Math.min(4, totalLen * 0.005);
        const prevProg = Math.max(0, progress - delta);
        const nextProg = Math.min(totalLen, progress + delta);

        const ptPrev = path.getPointAtLength(prevProg);
        const ptNext = path.getPointAtLength(nextProg);

        const angle1 = Math.atan2(pt.y - ptPrev.y, pt.x - ptPrev.x);
        const angle2 = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x);

        let diff = Math.abs(angle2 - angle1);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;

        // Map curvature to speed: high curvature (sharp turn) -> 70 km/h, straight -> 340 km/h
        const curvatureFactor = Math.min(1, diff / 0.35);
        const targetSpeed = 340 - (curvatureFactor * 270);

        // Transition actual speed towards target
        const stepRate = targetSpeed < speed ? 15 : 5.5; // Braking decel is much faster than engine acceleration
        speed += (targetSpeed - speed) * (stepRate / 100);
        setCurrentSpeed(Math.round(speed));

        // 3. Move along track (Slower progress scale for visible speed variation)
        const speedScale = 0.012; 
        progress += speed * speedScale;
        setLapProgress(progress);

        animationFrameId = requestAnimationFrame(updateFrame);
      } catch (e) {
        setIsPlayingLap(false);
      }
    };

    animationFrameId = requestAnimationFrame(updateFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlayingLap, pathLength]);

  const handleSectorClick = (e, sector) => {
    e.stopPropagation();
    setIsPlayingLap(false); // Stop lap simulator if active
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
      className={`${styles.cardContainer} ${isFeatured ? styles.featuredContainer : ''}`}
      onClick={() => setFlipped(!flipped)}
      style={{ '--circuit-color': circuit.color || 'var(--f1-red)' }}
    >
      <div className={`${styles.cardInner} ${flipped ? styles.isFlipped : ''}`}>

        {/* Front Face */}
        <div className={styles.cardFront}>
          {isFeatured && raceInfo && (
            <div className={`${styles.featuredBanner} ${isLiveWeekend ? styles.featuredBannerLive : ''}`}>
              <span className={styles.featuredBadge}>
                {isLiveWeekend ? (
                  <>Race Week <span className={styles.liveDot} /></>
                ) : (
                  'Next Race'
                )}
              </span>
              <span className={styles.featuredRaceName}>{raceInfo.raceName}</span>
              {!isLiveWeekend && countdownText && (
                <span className={styles.featuredCountdown}>{countdownText}</span>
              )}
            </div>
          )}
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
                    } else if (activeSector === 'overtake') {
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
                          activeSector === 'overtake' ? styles.highlightOvertake : ''
                        }`}
                        style={{
                          strokeDasharray: strokeDasharray,
                          strokeDashoffset: strokeDashoffset,
                        }}
                      />
                    );
                  })}
                  
                  {/* Glowing Animated Car Dot */}
                  {isPlayingLap && carPos && (
                    <>
                      <circle 
                        cx={carPos.x} 
                        cy={carPos.y} 
                        r="7" 
                        className={styles.carGlow}
                      />
                      <circle 
                        cx={carPos.x} 
                        cy={carPos.y} 
                        r="3.5" 
                        className={styles.carDot}
                      />
                    </>
                  )}
                </svg>
              </div>
            ) : svgUrl ? (
              <img src={svgUrl} alt={circuit.name} className={styles.svgMap} />
            ) : (
              <div className={styles.noMap}>Map Unavailable</div>
            )}

            {/* Telemetry HUD Panel positioned at the bottom of mapContainer */}
            {((activeSector && showHud && sectorInfo) || isPlayingLap) && (
              <div className={styles.hudOverlay} onClick={(e) => e.stopPropagation()}>
                {activeSector && !isPlayingLap && (
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
                )}
                {isPlayingLap ? (
                  <div className={styles.hudHeaderRow}>
                    <span className={styles.hudHeaderTitle} style={{ color: 'var(--f1-red)' }}>LIVE LAP</span>
                    <span className={styles.hudHeaderItem}>Speed: <strong style={{ fontFamily: 'monospace' }}>{currentSpeed} km/h</strong></span>
                    <span className={styles.hudHeaderItem}>G-Force: <strong style={{ fontFamily: 'monospace' }}>{Math.max(1.0, (1.0 + (330 - currentSpeed) / 60)).toFixed(1)} G</strong></span>
                  </div>
                ) : activeSector === 'overtake' ? (
                  <>
                    <div className={styles.hudHeaderRow}>
                      <span className={styles.hudHeaderTitle} style={{ color: '#39ff14' }}>OVERTAKE MODE</span>
                      <span className={styles.hudTextDetail} title={OVERTAKE_MODE_MECHANIC}>{OVERTAKE_MODE_MECHANIC}</span>
                    </div>
                    <div className={styles.hudHeaderRow}>
                      <span className={styles.hudTextDetail} title={sectorInfo.flavor}>{sectorInfo.flavor}</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.hudHeaderRow}>
                    <span className={styles.hudHeaderTitle} style={{ 
                      color: activeSector === 1 ? '#00f0ff' : activeSector === 2 ? '#ffe600' : '#ff007f' 
                    }}>
                      S{activeSector} Telemetry
                    </span>
                    <span className={styles.hudHeaderItem}>Max: <strong>{sectorInfo.maxSpeed}</strong></span>
                    <span className={styles.hudHeaderItem}>Gear: <strong>{sectorInfo.gear}</strong></span>
                    <span className={styles.hudTextDetail} title={sectorInfo.corner}>Corner: <strong>{sectorInfo.corner}</strong></span>
                  </div>
                )}
              </div>
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
                className={`${styles.sectorPill} ${activeSector === 'overtake' ? styles.activeOvertake : ''}`}
                onClick={(e) => handleSectorClick(e, 'overtake')}
                title="Overtake Mode"
              >
                OVERTAKE
              </button>
              <button 
                className={`${styles.playPill} ${isPlayingLap ? styles.activePlay : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSector(null);
                  setShowHud(false);
                  setIsPlayingLap(!isPlayingLap);
                }}
              >
                {isPlayingLap ? 'Stop Lap ⏹️' : 'Play Lap ▶️'}
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
              <div className={styles.statBox}>
                <span className={styles.statLabel}>First Grand Prix</span>
                <span className={styles.statValue}>{circuit.firstGp || 'N/A'}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Direction</span>
                <span className={styles.statValue}>{circuit.direction || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.flipHintBack}>Click to return <span>&larr;</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
