"use client";
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import TeamLogo from '@/components/TeamLogo';
import ProgressionChart from '@/components/ProgressionChart';

export default function StandingsPage() {
  const currentYear = new Date().getFullYear().toString();
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(currentYear);
  const [championship, setChampionship] = useState('driver'); // 'driver' or 'constructor'
  const [standingsData, setStandingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track expanded rows (driverId or constructorId)
  const [expandedId, setExpandedId] = useState(null);

  // Fetch list of seasons
  useEffect(() => {
    async function getSeasons() {
      try {
        const res = await fetch('/api/archive/seasons');
        if (!res.ok) throw new Error('Failed to fetch seasons');
        const data = await res.json();
        const fullSeasons = data.includes(currentYear) ? data : [currentYear, ...data];
        setSeasons(fullSeasons);
      } catch (err) {
        console.error('Error fetching seasons:', err);
        // Fallback list of seasons from current year down to 1950
        const fallback = [];
        for (let y = parseInt(currentYear); y >= 1950; y--) {
          fallback.push(y.toString());
        }
        setSeasons(fallback);
      }
    }
    getSeasons();
  }, [currentYear]);

  // Fetch standings data when season changes
  useEffect(() => {
    if (!selectedSeason) return;

    async function fetchStandings() {
      setLoading(true);
      setError(null);
      setExpandedId(null); // Reset expanded row on season change
      try {
        const res = await fetch(`/api/standings/${selectedSeason}`);
        if (!res.ok) throw new Error(`Failed to load standings for ${selectedSeason}`);
        const data = await res.json();
        setStandingsData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  const toggleRow = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  // Helper to render form badges
  const renderFormBadge = (resultStr, index) => {
    let badgeClass = styles.formOther;
    if (resultStr === 'P1') badgeClass = styles.formP1;
    else if (resultStr === 'P2') badgeClass = styles.formP2;
    else if (resultStr === 'P3') badgeClass = styles.formP3;
    else if (resultStr === 'DNF') badgeClass = styles.formDnf;

    return (
      <span key={`${resultStr}-${index}`} className={`${styles.formBadge} ${badgeClass}`}>
        {resultStr}
      </span>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{selectedSeason} Championship Standings</h1>
          <p className={styles.subtitle}>Explore WDC and WCC standings, stats, averages and recent form.</p>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.selectWrapper}>
            <select 
              value={selectedSeason} 
              onChange={(e) => setSelectedSeason(e.target.value)}
              className={styles.seasonSelect}
            >
              {seasons.map(year => (
                <option key={year} value={year}>{year} Season</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Pill Toggle Switch */}
      <div className={styles.toggleContainer}>
        <div className={styles.toggleSlider}>
          <button 
            className={`${styles.toggleBtn} ${championship === 'driver' ? styles.activeToggle : ''}`}
            onClick={() => { setChampionship('driver'); setExpandedId(null); }}
          >
            Driver Championship
          </button>
          <button 
            className={`${styles.toggleBtn} ${championship === 'constructor' ? styles.activeToggle : ''}`}
            onClick={() => { setChampionship('constructor'); setExpandedId(null); }}
          >
            Constructor Championship
          </button>
          {/* Sliding background pill */}
          <div className={`${styles.sliderBackground} ${championship === 'constructor' ? styles.sliderRight : ''}`} />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Analyzing paddock data...</p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <h3>Failed to load standings</h3>
          <p>{error}</p>
        </div>
      ) : standingsData ? (
        <>
          {standingsData.progression && (
            <ProgressionChart 
              progressionData={standingsData.progression} 
              type={championship} 
              wdcData={standingsData.wdc}
              wccData={standingsData.wcc}
            />
          )}

          <div className={styles.tableWrapper}>
            {championship === 'driver' ? (
            // DRIVER CHAMPIONSHIP TABLE
            <div className={styles.table}>
              <div className={`${styles.tableHeader} ${styles.driverGrid}`}>
                <div>Pos</div>
                <div>Driver</div>
                <div>Constructor</div>
                <div className={styles.textRight}>Wins</div>
                <div className={styles.textRight}>Points</div>
              </div>

              {standingsData.wdc.length === 0 ? (
                <div className={styles.noData}>No driver standings found for this season.</div>
              ) : (
                standingsData.wdc.map((item) => {
                  const isExpanded = expandedId === item.driverId;
                  return (
                    <div key={item.driverId} className={styles.rowGroup}>
                      <div 
                        className={`${styles.tableRow} ${styles.driverGrid} ${isExpanded ? styles.expandedRowHeader : ''}`}
                        onClick={() => toggleRow(item.driverId)}
                      >
                        <div className={styles.posCell}>{item.position}</div>
                        <div className={styles.driverCell}>
                          <span className={styles.driverFullName}>{item.driverName}</span>
                          <span className={styles.driverCode}>{item.driverCode}</span>
                          <span className={styles.driverNationality}>{item.nationality}</span>
                        </div>
                        <div className={styles.constructorCell}>
                          <TeamLogo constructorId={item.constructorId} constructorName={item.constructorName} size="sm" />
                          {item.constructorName}
                        </div>
                        <div className={`${styles.winsCell} ${styles.textRight}`}>{item.wins}</div>
                        <div className={`${styles.pointsCell} ${styles.textRight}`}>{item.points}</div>
                      </div>

                      {/* Expandable Panel */}
                      {isExpanded && (
                        <div className={styles.expandedPanel}>
                          <div className={styles.expandedStatsGrid}>
                            <div className={styles.statBox}>
                              <span className={styles.statLabel}>Average Finish</span>
                              <span className={styles.statValue}>{item.averageFinish}</span>
                              <span className={styles.statNote}>(Excludes DNFs)</span>
                            </div>
                            <div className={styles.statBox}>
                              <span className={styles.statLabel}>Average Qualifying</span>
                              <span className={styles.statValue}>{item.averageQualifying}</span>
                              <span className={styles.statNote}>(All Sessions)</span>
                            </div>
                            <div className={styles.statBox}>
                              <span className={styles.statLabel}>Podiums</span>
                              <span className={styles.statValue}>{item.podiums}</span>
                              <span className={styles.statNote}>Total Top 3s</span>
                            </div>
                            <div className={`${styles.statBox} ${styles.formBox}`}>
                              <span className={styles.statLabel}>Recent Form</span>
                              {item.recentForm.length > 0 ? (
                                <div className={styles.formRow}>
                                  {item.recentForm.map((f, idx) => renderFormBadge(f, idx))}
                                </div>
                              ) : (
                                <span className={styles.noForm}>No race results yet</span>
                              )}
                              <span className={styles.statNote}>Oldest &rarr; Newest</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // CONSTRUCTOR CHAMPIONSHIP TABLE
            <div className={styles.table}>
              <div className={`${styles.tableHeader} ${styles.constructorGrid}`}>
                <div>Pos</div>
                <div>Constructor</div>
                <div className={styles.textRight}>Wins</div>
                <div className={styles.textRight}>Points</div>
              </div>

              {standingsData.wcc.length === 0 ? (
                <div className={styles.noData}>No constructor standings found for this season.</div>
              ) : (
                standingsData.wcc.map((item) => {
                  const isExpanded = expandedId === item.constructorId;
                  
                  // Calculate the sum of driver points from our breakdown to represent actual relative contribution
                  const totalDriverPoints = item.driverBreakdown.reduce((sum, d) => sum + d.points, 0);
                  
                  return (
                    <div key={item.constructorId} className={styles.rowGroup}>
                      <div 
                        className={`${styles.tableRow} ${styles.constructorGrid} ${isExpanded ? styles.expandedRowHeader : ''}`}
                        onClick={() => toggleRow(item.constructorId)}
                      >
                        <div className={styles.posCell}>{item.position}</div>
                        <div className={styles.constructorNameCell}>
                          <TeamLogo constructorId={item.constructorId} constructorName={item.constructorName} size="md" />
                          <div className={styles.constructorNameInfo}>
                            <span className={styles.constructorNameText}>{item.constructorName}</span>
                            <span className={styles.constructorNationality}>{item.nationality}</span>
                          </div>
                        </div>
                        <div className={`${styles.winsCell} ${styles.textRight}`}>{item.wins}</div>
                        <div className={`${styles.pointsCell} ${styles.textRight}`}>{item.points}</div>
                      </div>

                      {/* Expandable Panel */}
                      {isExpanded && (
                        <div className={styles.expandedPanel}>
                          <div className={styles.expandedStatsGrid}>
                            <div className={styles.statBox}>
                              <span className={styles.statLabel}>Best Finish</span>
                              <span className={styles.statValue}>{item.bestFinish}</span>
                              <span className={styles.statNote}>Highest Result</span>
                            </div>
                            <div className={styles.statBox}>
                              <span className={styles.statLabel}>Podiums</span>
                              <span className={styles.statValue}>{item.podiums}</span>
                              <span className={styles.statNote}>Combined Driver Podiums</span>
                            </div>
                            <div className={`${styles.statBox} ${styles.breakdownBox}`}>
                              <span className={styles.statLabel}>Driver Contribution</span>
                              {item.driverBreakdown.length > 0 ? (
                                <div className={styles.breakdownList}>
                                  {item.driverBreakdown.map((dr) => {
                                    const drPoints = dr.points;
                                    const percentage = totalDriverPoints > 0 ? Math.round((drPoints / totalDriverPoints) * 100) : 0;
                                    
                                    return (
                                      <div key={dr.driverId} className={styles.breakdownRow}>
                                        <div className={styles.breakdownInfo}>
                                          <span className={styles.breakdownName}>{dr.name}</span>
                                          <span className={styles.breakdownPoints}>{drPoints} pts ({percentage}%)</span>
                                        </div>
                                        <div className={styles.progressBarBg}>
                                          <div 
                                            className={styles.progressBarFill} 
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className={styles.noForm}>No driver data available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </>
    ) : null}
    </div>
  );
}
