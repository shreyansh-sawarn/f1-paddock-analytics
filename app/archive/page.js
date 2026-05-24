"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './page.module.css';
import ResultCard from '@/components/ResultCard';
import TeamLogo from '@/components/TeamLogo';

export default function Archive() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search inputs
  const [yearSearch, setYearSearch] = useState('');
  const [gpSearch, setGpSearch] = useState('');
  
  // Custom dropdown visibility
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showGpDropdown, setShowGpDropdown] = useState(false);
  
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [seasonData, setSeasonData] = useState({});
  const [loadingSeason, setLoadingSeason] = useState(false);

  // Refs for closing dropdowns on click outside
  const yearContainerRef = useRef(null);
  const gpContainerRef = useRef(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (yearContainerRef.current && !yearContainerRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
      if (gpContainerRef.current && !gpContainerRef.current.contains(event.target)) {
        setShowGpDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch season data when a season is toggled or auto-expanded
  const loadSeasonData = useCallback(async (year) => {
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
  }, [seasonData]);

  const toggleSeason = async (year) => {
    if (expandedSeason === year) {
      setExpandedSeason(null);
      setGpSearch(''); // Clear GP search on close
      return;
    }

    setExpandedSeason(year);
    await loadSeasonData(year);
  };

  // Auto-expand season card if yearSearch perfectly matches a loaded season year
  useEffect(() => {
    if (seasons.includes(yearSearch)) {
      const timeout = setTimeout(() => {
        setExpandedSeason(yearSearch);
        loadSeasonData(yearSearch);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [yearSearch, seasons, loadSeasonData]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading Archive...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--f1-red)', fontWeight: 'bold' }}>Error: {error}</div>;
  }

  // Year suggestions filtered by user text input
  const yearSuggestions = seasons.filter(y => {
    if (!yearSearch) return true;
    return y.toString().includes(yearSearch);
  });

  const filteredSeasons = yearSuggestions;

  // Extract unique Grand Prix suggestion objects for the expanded season
  const getGpSuggestions = () => {
    const data = seasonData[expandedSeason];
    if (!data) return [];
    
    return data.races.map(race => ({
      name: race.raceName,
      circuit: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country
    }));
  };

  // Filter GP suggestions based on user text input
  const gpSuggestions = getGpSuggestions().filter(s => {
    if (!gpSearch) return true;
    const query = gpSearch.toLowerCase();
    return s.name.toLowerCase().includes(query) ||
           s.circuit.toLowerCase().includes(query) ||
           s.locality.toLowerCase().includes(query) ||
           s.country.toLowerCase().includes(query);
  });

  // Filter races inside the expanded season based on GP search input
  const getFilteredRaces = (year) => {
    const data = seasonData[year];
    if (!data) return [];
    if (!gpSearch) return data.races;

    const query = gpSearch.toLowerCase();
    return data.races.filter(race => 
      race.raceName.toLowerCase().includes(query) ||
      race.Circuit.circuitName.toLowerCase().includes(query) ||
      race.Circuit.Location.locality.toLowerCase().includes(query) ||
      race.Circuit.Location.country.toLowerCase().includes(query)
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>F1 Archive</h1>
          <p className={styles.subtitle}>Explore past seasons, champions, and race results.</p>
        </div>
        
        {/* Filter and Search Dashboard */}
        <div className={styles.searchControls}>
        {/* Season Year Filter Field */}
        <div className={styles.searchField} ref={yearContainerRef}>
          <label className={styles.searchLabel}>Season Year</label>
          <div className={styles.inputWrapper}>
            <input 
              type="text"
              placeholder="Search or select year..." 
              value={yearSearch} 
              onChange={(e) => {
                setYearSearch(e.target.value);
                setShowYearDropdown(true);
              }}
              onFocus={() => setShowYearDropdown(true)}
              className={styles.searchInput}
            />
            {yearSearch && (
              <button 
                className={styles.clearBtn} 
                onClick={() => { 
                  setYearSearch(''); 
                  setExpandedSeason(null);
                  setGpSearch('');
                }}
              >
                &times;
              </button>
            )}

          </div>

          {/* Custom Year Dropdown Suggestions */}
          {showYearDropdown && yearSuggestions.length > 0 && (
            <ul className={styles.dropdownList}>
              {yearSuggestions.map(y => (
                <li 
                  key={y} 
                  className={styles.dropdownItem}
                  onClick={() => {
                    setYearSearch(y);
                    setShowYearDropdown(false);
                  }}
                >
                  {y} Season
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* GP Suggestion Filter Field */}
        <div className={styles.searchField} ref={gpContainerRef}>
          <label className={styles.searchLabel}>Filter by Grand Prix</label>
          <div className={styles.inputWrapper}>
            <input 
              type="text" 
              placeholder={expandedSeason ? "Search GP, Circuit, or City..." : "Select a season first to search GPs"} 
              value={gpSearch}
              onChange={(e) => {
                setGpSearch(e.target.value);
                setShowGpDropdown(true);
              }}
              onFocus={() => setShowGpDropdown(true)}
              className={styles.searchInput}
              disabled={!expandedSeason}
            />
            {gpSearch && (
              <button className={styles.clearBtn} onClick={() => setGpSearch('')}>&times;</button>
            )}

          </div>

          {/* Custom GP Suggestions Dropdown */}
          {showGpDropdown && expandedSeason && gpSuggestions.length > 0 && (
            <ul className={styles.dropdownList}>
              {gpSuggestions.map((s, idx) => (
                <li 
                  key={`${s.name}-${idx}`} 
                  className={styles.dropdownItem}
                  onClick={() => {
                    setGpSearch(s.name);
                    setShowGpDropdown(false);
                  }}
                >
                  <div className={styles.gpSugName}>{s.name}</div>
                  <div className={styles.gpSugCircuit}>{s.circuit} ({s.locality}, {s.country})</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>


      <div className={styles.seasonList}>
        {filteredSeasons.length === 0 ? (
          <div className={styles.noResults}>No seasons found matching your search.</div>
        ) : (
          filteredSeasons.map(year => {
            const races = getFilteredRaces(year);
            return (
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
                                <TeamLogo constructorId={seasonData[year].wdc.constructorId} constructorName={seasonData[year].wdc.constructor} size="sm" />
                                {seasonData[year].wdc.constructor} &bull; {seasonData[year].wdc.points} pts
                              </span>
                            )}
                          </div>
                          <div className={styles.champCard}>
                            <span className={styles.champLabel}>World Constructor Champion</span>
                            <h3 className={styles.champName}>
                              <TeamLogo constructorId={seasonData[year].wcc?.constructorId} constructorName={seasonData[year].wcc?.name} size="md" />
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
                          {races.length === 0 ? (
                            <p className={styles.noResults}>
                              {gpSearch ? "No races match your search." : "No races found for this season."}
                            </p>
                          ) : (
                            <div className="race-list">
                              {races.map(race => (
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
            );
          })
        )}
      </div>
    </div>
  );
}
