"use client";
import React, { useState, useEffect } from 'react';
import ResultCard from '@/components/ResultCard';

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
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--f1-dark)' }}>Formula 1 Results</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Completed races from the current season.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Order:</label>
          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ 
              padding: '0.5rem', 
              borderRadius: '4px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)',
              cursor: 'pointer' 
            }}
          >
            <option value="desc">Latest First</option>
            <option value="asc">Oldest First</option>
          </select>
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
