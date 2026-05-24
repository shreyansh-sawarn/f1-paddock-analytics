import React from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getCircuitMap } from '@/lib/circuitMaps';
import { circuitData } from '@/lib/circuitData';
import CircuitCard from './CircuitCard';

export default function CircuitsPage() {
  const circuits = Object.entries(circuitData).map(([id, data]) => ({
    circuitId: id,
    ...data
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Track Maps</h1>
          <p className={styles.subtitle}>Explore the official SVG layouts and statistics for the current circuit calendar.</p>
        </div>
      </header>

      <div className={styles.grid}>
        {circuits.map(circuit => {
          const svgUrl = getCircuitMap(circuit.circuitId);
          return (
            <CircuitCard 
              key={circuit.circuitId} 
              circuitId={circuit.circuitId} 
              circuit={circuit} 
              svgUrl={svgUrl} 
            />
          );
        })}
      </div>
    </div>
  );
}
