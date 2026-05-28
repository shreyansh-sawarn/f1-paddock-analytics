"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './TelemetryDashboard.module.css';
import TeamLogo from './TeamLogo';

// Procedural fallback lap telemetry generator
const generateMockTelemetry = (driverA, driverB, totalLaps = 50) => {
  const getSeed = (driver) => {
    const name = driver?.Driver?.familyName || "Driver";
    return name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  };

  const seedA = getSeed(driverA);
  const seedB = getSeed(driverB);

  // Generate 100 data points representing a single lap
  const generateLapData = (seed, driver) => {
    const data = [];
    const speedOffset = (seed % 10) - 5; // -5 to +5 km/h
    const brakeDelay = (seed % 3); // shift corners slightly

    for (let i = 0; i < 100; i++) {
      let speed = 250;
      let throttle = 100;
      let brake = false;
      let gear = 6;

      // Simple procedural track layout with 3 corners
      // Corner 1: index 20 to 30
      if (i >= 20 && i <= 32) {
        const t = (i - 20) / 12;
        speed = 310 - (310 - 80) * Math.sin(t * Math.PI);
        throttle = i < 23 ? 0 : (i - 23) * 11;
        brake = i >= 20 && i < 24;
        gear = speed > 200 ? 7 : speed > 130 ? 5 : 3;
      }
      // Corner 2: index 55 to 65
      else if (i >= 52 + brakeDelay && i <= 65 + brakeDelay) {
        const t = (i - (52 + brakeDelay)) / 13;
        speed = 290 - (290 - 110) * Math.sin(t * Math.PI);
        throttle = i < 55 + brakeDelay ? 0 : (i - (55 + brakeDelay)) * 10;
        brake = i >= 52 + brakeDelay && i < 56 + brakeDelay;
        gear = speed > 220 ? 6 : speed > 150 ? 4 : 3;
      }
      // Corner 3: index 80 to 90
      else if (i >= 80 && i <= 90) {
        const t = (i - 80) / 10;
        speed = 300 - (300 - 95) * Math.sin(t * Math.PI);
        throttle = i < 82 ? 0 : (i - 82) * 12;
        brake = i >= 80 && i < 83;
        gear = speed > 210 ? 6 : speed > 140 ? 4 : 3;
      }
      // Straight lines
      else {
        if (i < 20) {
          speed = 200 + (i * 5.5);
          gear = speed > 280 ? 8 : 7;
        } else if (i < 52) {
          speed = 240 + ((i - 32) * 3.5);
          gear = speed > 290 ? 8 : 7;
        } else {
          speed = 250 + ((i - 90) * 6);
          gear = speed > 290 ? 8 : 7;
        }
        throttle = 100;
        brake = false;
      }

      // Add driver offset and small random noise
      speed = Math.round(speed + speedOffset + (Math.sin(i * 0.5) * 2));
      throttle = Math.max(0, Math.min(100, Math.round(throttle)));

      data.push({
        percentage: i,
        speed,
        throttle,
        brake,
        gear
      });
    }
    return {
      lapNumber: 12 + (seed % 20),
      lapDuration: (75.432 + (seed % 1000) / 500).toFixed(3),
      data
    };
  };

  return {
    driverA: generateLapData(seedA, driverA),
    driverB: generateLapData(seedB, driverB)
  };
};

export default function TelemetryDashboard({ openf1SessionKey, openf1Sessions = [], results }) {
  const [driverANum, setDriverANum] = useState('');
  const [driverBNum, setDriverBNum] = useState('');
  const [chartMode, setChartMode] = useState('speed'); // 'speed', 'throttle', 'brake'
  const [activeSessionKey, setActiveSessionKey] = useState(openf1SessionKey);
  
  const [telemetryA, setTelemetryA] = useState(null);
  const [telemetryB, setTelemetryB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  // In-memory cache for fetched laps & telemetry to prevent redundant API calls
  const telemetryCache = useRef({});
  const sessionLaps = useRef({});

  // Sync activeSessionKey when openf1SessionKey changes (season/race change)
  useEffect(() => {
    setActiveSessionKey(openf1SessionKey);
  }, [openf1SessionKey]);

  // Initialize selected drivers
  useEffect(() => {
    if (results && results.length >= 2) {
      setDriverANum(results[0].number);
      setDriverBNum(results[1].number);
    }
  }, [results]);

  const fetchSessionLaps = async (sessionKey) => {
    if (sessionLaps.current[sessionKey]) return sessionLaps.current[sessionKey];
    const url = `https://api.openf1.org/v1/laps?session_key=${sessionKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch session laps');
    const data = await res.json();
    sessionLaps.current[sessionKey] = data;
    return data;
  };

  // Load Driver A
  useEffect(() => {
    if (!driverANum || !results) return;
    const driverAObj = results.find(d => d.number === driverANum);
    if (!activeSessionKey) {
      const mock = generateMockTelemetry(driverAObj, driverAObj).driverA;
      setTelemetryA({ ...mock, isDemo: true });
      setErrorA(null);
      return;
    }

    let active = true;
    async function loadA() {
      setLoadingA(true);
      setErrorA(null);
      try {
        const data = await getDriverTelemetry(driverANum, activeSessionKey);
        if (active) {
          setTelemetryA(data);
        }
      } catch (err) {
        console.error('Failed to load telemetry for Driver A:', err);
        if (active) {
          const mock = generateMockTelemetry(driverAObj, driverAObj).driverA;
          setTelemetryA({ ...mock, isDemo: true });
          setErrorA('Driver A OpenF1 limit. Showing simulation.');
        }
      } finally {
        if (active) setLoadingA(false);
      }
    }
    loadA();
    return () => { active = false; };
  }, [activeSessionKey, driverANum, results]);

  // Load Driver B
  useEffect(() => {
    if (!driverBNum || !results) return;
    const driverBObj = results.find(d => d.number === driverBNum);
    if (!activeSessionKey) {
      const mock = generateMockTelemetry(driverBObj, driverBObj).driverB;
      setTelemetryB({ ...mock, isDemo: true });
      setErrorB(null);
      return;
    }

    let active = true;
    async function loadB() {
      setLoadingB(true);
      setErrorB(null);
      try {
        const data = await getDriverTelemetry(driverBNum, activeSessionKey);
        if (active) {
          setTelemetryB(data);
        }
      } catch (err) {
        console.error('Failed to load telemetry for Driver B:', err);
        if (active) {
          const mock = generateMockTelemetry(driverBObj, driverBObj).driverB;
          setTelemetryB({ ...mock, isDemo: true });
          setErrorB('Driver B OpenF1 limit. Showing simulation.');
        }
      } finally {
        if (active) setLoadingB(false);
      }
    }
    loadB();
    return () => { active = false; };
  }, [activeSessionKey, driverBNum, results]);

  // Downsample telemetry arrays to 100 points
  const downsampleData = (rawData) => {
    if (!rawData || rawData.length === 0) return [];
    const size = 100;
    const result = [];
    const step = rawData.length / size;
    for (let i = 0; i < size; i++) {
      const idx = Math.min(Math.floor(i * step), rawData.length - 1);
      const item = rawData[idx];
      result.push({
        percentage: i,
        speed: parseInt(item.speed, 10) || 0,
        throttle: parseInt(item.throttle, 10) || 0,
        brake: item.brake === 1 || item.brake === true || parseFloat(item.brake) > 0,
        gear: parseInt(item.gear, 10) || 1
      });
    }
    return result;
  };

  const getDriverTelemetry = async (driverNum, sessionKey) => {
    const cacheKey = `${sessionKey}_${driverNum}`;
    // 1. Check cache first
    if (telemetryCache.current[cacheKey]) {
      return telemetryCache.current[cacheKey];
    }

    // 2. Get laps (using session-wide cache to eliminate 50% of API calls)
    const laps = await fetchSessionLaps(sessionKey);
    const driverLaps = laps.filter(l => l.driver_number === parseInt(driverNum, 10) && l.lap_duration && l.date_start);
    if (driverLaps.length === 0) throw new Error(`No valid laps found for driver ${driverNum}`);
    
    // Find fastest lap
    const fastestLap = driverLaps.reduce((best, curr) => 
      curr.lap_duration < best.lap_duration ? curr : best
    , driverLaps[0]);

    // Calculate dates
    const startDate = new Date(fastestLap.date_start);
    const endDate = new Date(startDate.getTime() + fastestLap.lap_duration * 1000);

    // 3. Fetch telemetry of that fastest lap
    const telemetryUrl = `https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${driverNum}&date>=${startDate.toISOString()}&date<=${endDate.toISOString()}`;
    const teleRes = await fetch(telemetryUrl);
    if (!teleRes.ok) throw new Error(`Telemetry fetch failed for driver ${driverNum}`);
    const rawTele = await teleRes.json();

    const downsampled = downsampleData(rawTele);

    const result = {
      lapNumber: fastestLap.lap_number,
      lapDuration: fastestLap.lap_duration.toFixed(3),
      data: downsampled,
      isDemo: false
    };

    // 4. Save to cache
    telemetryCache.current[cacheKey] = result;
    return result;
  };

  const driverA = results?.find(d => d.number === driverANum);
  const driverB = results?.find(d => d.number === driverBNum);

  if (!results || results.length < 2) return null;

  // Build SVG overlay lines
  const generatePath = (data, field) => {
    if (!data || data.length === 0) return '';
    let maxValue = 350; // default speed limit
    if (field === 'throttle') maxValue = 100;
    else if (field === 'brake') maxValue = 1;

    return data.map((d, i) => {
      const x = i * 8.5 + 7.5; // map 0-100 to 7.5%-92.5%
      let val = d[field];
      if (field === 'brake') val = val ? 1 : 0;
      const y = 90 - (val / maxValue) * 80;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const isDemoData = (telemetryA?.isDemo || telemetryB?.isDemo);
  const loading = (loadingA || loadingB);
  const combinedError = errorA || errorB;

  const speedPathA = telemetryA ? generatePath(telemetryA.data, 'speed') : '';
  const speedPathB = telemetryB ? generatePath(telemetryB.data, 'speed') : '';
  const throttlePathA = telemetryA ? generatePath(telemetryA.data, 'throttle') : '';
  const throttlePathB = telemetryB ? generatePath(telemetryB.data, 'throttle') : '';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3 className={styles.title}>Fastest Lap Telemetry Analysis</h3>
          {isDemoData && (
            <span className={styles.demoBadge} title="Running procedural simulation due to API or year limits.">
              Simulated Telemetry
            </span>
          )}
        </div>
        <p className={styles.description}>
          Compare throttle, brake, and speed graphs of two drivers over their fastest race laps.
        </p>
      </div>

      {/* Driver & Session Selectors */}
      <div className={styles.selectors}>
        {openf1Sessions && openf1Sessions.length > 0 && (
          <div className={styles.selectorField}>
            <label className={styles.label}>Session:</label>
            <div className={styles.selectWrapper}>
              <select 
                value={activeSessionKey || ''} 
                onChange={(e) => setActiveSessionKey(parseInt(e.target.value, 10))}
                className={styles.select}
              >
                {openf1Sessions.map(s => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className={styles.selectorField}>
          <label className={styles.label}>Driver A:</label>
          <div className={styles.selectWrapper}>
            <select 
              value={driverANum} 
              onChange={(e) => setDriverANum(e.target.value)}
              className={styles.select}
            >
              {results.map(d => (
                <option key={d.number} value={d.number} disabled={d.number === driverBNum}>
                  P{d.position} - {d.Driver.givenName} {d.Driver.familyName} ({d.Constructor.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.selectorField}>
          <label className={styles.label}>Driver B:</label>
          <div className={styles.selectWrapper}>
            <select 
              value={driverBNum} 
              onChange={(e) => setDriverBNum(e.target.value)}
              className={styles.select}
            >
              {results.map(d => (
                <option key={d.number} value={d.number} disabled={d.number === driverANum}>
                  P{d.position} - {d.Driver.givenName} {d.Driver.familyName} ({d.Constructor.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Toggles */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabBtn} ${chartMode === 'speed' ? styles.activeTab : ''}`}
          onClick={() => setChartMode('speed')}
        >
          Speed Comparison
        </button>
        <button 
          className={`${styles.tabBtn} ${chartMode === 'throttle' ? styles.activeTab : ''}`}
          onClick={() => setChartMode('throttle')}
        >
          Throttle Profile
        </button>
      </div>

      {/* Main Chart Area */}
      <div className={styles.chartWrapper}>
        {loading ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Fetching OpenF1 lap telemetry...</p>
          </div>
        ) : combinedError ? (
          <div className={styles.fallbackNotice}>
            <span>{combinedError}</span>
          </div>
        ) : null}

        {(telemetryA || telemetryB) && (
          <>
            <div className={styles.chartArea}>
              <svg className={styles.svgArea} viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid Lines */}
                <line x1="7.5" y1="10" x2="7.5" y2="90" className={styles.gridLine} />
                <line x1="7.5" y1="90" x2="92.5" y2="90" className={styles.gridLine} />
                <line x1="7.5" y1="50" x2="92.5" y2="50" className={styles.gridLine} strokeDasharray="2,2" />
                <line x1="50" y1="10" x2="50" y2="90" className={styles.gridLine} strokeDasharray="2,2" />

                {/* Paths */}
                {chartMode === 'speed' && (
                  <>
                    <path d={speedPathA} className={`${styles.pathLine} ${styles.pathA}`} />
                    <path d={speedPathB} className={`${styles.pathLine} ${styles.pathB}`} strokeDasharray="3,3" />
                  </>
                )}
                {chartMode === 'throttle' && (
                  <>
                    <path d={throttlePathA} className={`${styles.pathLine} ${styles.pathA}`} />
                    <path d={throttlePathB} className={`${styles.pathLine} ${styles.pathB}`} strokeDasharray="3,3" />
                  </>
                )}
              </svg>

              {/* Labels */}
              <div className={styles.axisX}>Lap Distance (0% to 100%) &rarr;</div>
              <div className={styles.axisY}>
                {chartMode === 'speed' ? 'Speed (km/h) 350' : 'Throttle (%) 100'}
              </div>
              <div className={styles.axisYBottom}>0</div>
            </div>

            {/* Drivers Stats Info Overlay - Positioned Below Chart */}
            <div className={styles.chartLegend}>
              <div className={`${styles.legendItem} ${styles.legendA}`}>
                <TeamLogo constructorId={driverA?.Constructor?.constructorId} size="sm" />
                <span className={styles.legendName}>{driverA?.Driver.familyName}</span>
                {telemetryA && <span className={styles.legendLap}>Lap {telemetryA.lapNumber} ({telemetryA.lapDuration}s)</span>}
              </div>
              <div className={`${styles.legendItem} ${styles.legendB}`}>
                <TeamLogo constructorId={driverB?.Constructor?.constructorId} size="sm" />
                <span className={styles.legendName}>{driverB?.Driver.familyName}</span>
                {telemetryB && <span className={styles.legendLap}>Lap {telemetryB.lapNumber} ({telemetryB.lapDuration}s)</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
