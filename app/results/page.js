"use client";
import React, { useState, useEffect } from 'react';
import ResultCard from '@/components/ResultCard';
import styles from './page.module.css';

export default function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = Reverse Chronological, 'asc' = Chronological

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch('/api/results');
        if (!res.ok) throw new Error('Failed to fetch results');
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Loading F1 Results...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'var(--f1-red)', fontWeight: 'bold' }}>Error: {error}</div>;
  }

  const sortedResults = [...results].sort((a, b) => {
    const numA = parseInt(a.round, 10);
    const numB = parseInt(b.round, 10);
    return sortOrder === 'desc' ? numB - numA : numA - numB;
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Formula 1 Results</h1>
          <p className={styles.subtitle}>Completed races from the current season.</p>
        </div>
        <div className={styles.controls}>
          <label className={styles.label}>Order:</label>
          <div className={styles.selectWrapper}>
            <select 
              value={sortOrder} 
              onChange={(e) => setSortOrder(e.target.value)}
              className={styles.orderSelect}
            >
              <option value="desc">Latest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </header>
      
      <div className="race-list">
        {sortedResults.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No completed races yet for this season.</div>
        ) : (
          sortedResults.map((race) => (
            <ResultCard 
              key={race.round} 
              race={race} 
            />
          ))
        )}
      </div>
    </div>
  );
}
