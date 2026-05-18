"use client";
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import ResultCard from '@/components/ResultCard';

export default function Archive() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [seasonData, setSeasonData] = useState({});
  const [loadingSeason, setLoadingSeason] = useState(false);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const res = await fetch('/api/archive/seasons');
        if (!res.ok) throw new Error('Failed to fetch seasons');
        const data = await res.json();
        setSeasons(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSeasons();
  }, []);

  const toggleSeason = async (year) => {
    if (expandedSeason === year) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(year);

    if (!seasonData[year]) {
      setLoadingSeason(true);
      try {
        const res = await fetch(`/api/archive/${year}`);
        if (!res.ok) throw new Error(`Failed to fetch data for ${year}`);
        const data = await res.json();
        setSeasonData(prev => ({ ...prev, [year]: data }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSeason(false);
      }
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading Archive...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--f1-red)', fontWeight: 'bold' }}>Error: {error}</div>;
  }

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--f1-dark)' }}>F1 Archive</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Explore past seasons, champions, and race results.</p>
      </header>

      <div className={styles.seasonList}>
        {seasons.map(year => (
          <div key={year} className={styles.seasonCard}>
            <div 
              className={styles.seasonHeader} 
              onClick={() => toggleSeason(year)}
            >
              <h2>{year} Season</h2>
              <span className={styles.toggleIcon}>{expandedSeason === year ? '▲' : '▼'}</span>
            </div>

            {expandedSeason === year && (
              <div className={styles.seasonContent}>
                {loadingSeason && !seasonData[year] ? (
                  <div className={styles.loading}>Loading season data...</div>
                ) : seasonData[year] ? (
                  <>
                    <div className={styles.champions}>
                      <div className={styles.champCard}>
                        <span className={styles.champLabel}>World Driver Champion</span>
                        <h3 className={styles.champName}>
                          {seasonData[year].wdc ? seasonData[year].wdc.driver : 'N/A'}
                        </h3>
                        {seasonData[year].wdc && (
                          <span className={styles.champDetails}>
                            {seasonData[year].wdc.constructor} &bull; {seasonData[year].wdc.points} pts
                          </span>
                        )}
                      </div>
                      <div className={styles.champCard}>
                        <span className={styles.champLabel}>World Constructor Champion</span>
                        <h3 className={styles.champName}>
                          {seasonData[year].wcc ? seasonData[year].wcc.name : 'N/A'}
                        </h3>
                        {seasonData[year].wcc && (
                          <span className={styles.champDetails}>
                            {seasonData[year].wcc.points} pts
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.racesList}>
                      <h3 className={styles.racesTitle}>Race Results</h3>
                      {seasonData[year].races.length === 0 ? (
                        <p>No races found for this season.</p>
                      ) : (
                        <div className="race-list">
                          {seasonData[year].races.map(race => (
                            <ResultCard key={race.round} race={race} />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.error}>Failed to load season data.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
