"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './ProgressionChart.module.css';
import { getConstructorColor } from '@/lib/teamColors';

export default function ProgressionChart({ progressionData, type, wdcData, wccData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartRef = useRef(null);

  const rounds = progressionData?.rounds || [];
  const numRounds = rounds.length;

  // 1. Get the list of items (drivers or constructors) and their display names / info
  const items = React.useMemo(() => {
    if (!progressionData) return [];

    if (type === 'driver') {
      return (wdcData || []).map(d => ({
        id: d.driverId,
        name: d.driverName,
        code: d.driverCode,
        constructorId: d.constructorId,
        constructorName: d.constructorName,
        color: getConstructorColor(d.constructorId),
        pointsHistory: progressionData.drivers[d.driverId] || []
      }));
    } else {
      return (wccData || []).map(c => ({
        id: c.constructorId,
        name: c.constructorName,
        constructorId: c.constructorId,
        color: getConstructorColor(c.constructorId),
        pointsHistory: progressionData.constructors[c.constructorId] || []
      }));
    }
  }, [progressionData, type, wdcData, wccData]);

  // 2. Initialize visible lines
  useEffect(() => {
    if (items.length === 0) return;
    
    if (type === 'driver') {
      // Show top 10 drivers by default to avoid clutter
      setVisibleIds(items.slice(0, 10).map(item => item.id));
    } else {
      // Show all constructors by default (usually 10 teams)
      setVisibleIds(items.map(item => item.id));
    }
    setHoveredPoint(null);
  }, [items, type]);

  if (numRounds === 0 || items.length === 0) {
    return (
      <div className={styles.noDataContainer}>
        <p>No round-by-round telemetry data available to plot progression for this season.</p>
      </div>
    );
  }

  // 3. Find global max points for Y scaling
  const maxPoints = React.useMemo(() => {
    let max = 10;
    items.forEach(item => {
      if (item.pointsHistory.length > 0) {
        const itemMax = Math.max(...item.pointsHistory);
        if (itemMax > max) max = itemMax;
      }
    });
    // Add 10% headroom
    return Math.ceil(max * 1.1);
  }, [items]);

  // 4. Chart dimensions
  const svgWidth = 1000;
  const svgHeight = 450;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 50;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate coordinates:
  // Round 0: 0 points (starting point)
  // Round i (1 to numRounds): index i
  const getCoordinates = (pointsArray) => {
    const points = [0, ...pointsArray]; // Prepend 0 points for start line
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / numRounds) * chartWidth;
      const y = svgHeight - paddingBottom - (p / maxPoints) * chartHeight;
      return { x, y, val: p, roundIndex: idx };
    });
  };

  const toggleLine = (id) => {
    if (visibleIds.includes(id)) {
      setVisibleIds(visibleIds.filter(vId => vId !== id));
    } else {
      setVisibleIds([...visibleIds, id]);
    }
  };

  const toggleAll = (showAll) => {
    if (showAll) {
      setVisibleIds(items.map(item => item.id));
    } else {
      setVisibleIds([]);
    }
  };

  // Generate gridlines for Y axis (5 ticks)
  const yTicks = [];
  for (let i = 0; i <= 5; i++) {
    const p = Math.round((maxPoints / 5) * i);
    const y = svgHeight - paddingBottom - (p / maxPoints) * chartHeight;
    yTicks.push({ label: p, y });
  }

  // Generate gridlines for X axis
  const xTicks = [{ label: 'Start', x: paddingLeft, roundIndex: 0 }];
  rounds.forEach((r, idx) => {
    const x = paddingLeft + ((idx + 1) / numRounds) * chartWidth;
    xTicks.push({ 
      label: `R${r.round}`, 
      locality: r.locality, 
      raceName: r.raceName,
      x, 
      roundIndex: idx + 1 
    });
  });

  return (
    <div className={styles.wrapper}>
      <button 
        className={styles.collapseHeader} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.headerTitle}>
          <span className={styles.icon}>📊</span> Points Progression Timeline
        </span>
        <span className={styles.toggleState}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className={styles.content}>
          {/* Quick Filters */}
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Toggle Lines:</span>
            <button className={styles.pillButton} onClick={() => toggleAll(true)}>Select All</button>
            <button className={styles.pillButton} onClick={() => toggleAll(false)}>Clear All</button>
            {type === 'driver' && (
              <button 
                className={styles.pillButton} 
                onClick={() => setVisibleIds(items.slice(0, 10).map(item => item.id))}
              >
                Top 10 Only
              </button>
            )}
          </div>

          {/* SVG Chart */}
          <div className={styles.chartContainer} ref={chartRef}>
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className={styles.svg}
              onClick={() => setHoveredPoint(null)}
            >
              {/* Definitions for glowing constructor colors */}
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Y Axis Gridlines */}
              {yTicks.map((tick, i) => (
                <g key={`y-grid-${i}`} className={styles.gridLine}>
                  <line 
                    x1={paddingLeft} 
                    y1={tick.y} 
                    x2={svgWidth - paddingRight} 
                    y2={tick.y} 
                  />
                  <text 
                    x={paddingLeft - 10} 
                    y={tick.y + 4} 
                    className={styles.yLabel}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* X Axis Gridlines */}
              {xTicks.map((tick, i) => (
                <g key={`x-grid-${i}`} className={styles.gridLine}>
                  <line 
                    x1={tick.x} 
                    y1={paddingTop} 
                    x2={tick.x} 
                    y2={svgHeight - paddingBottom} 
                  />
                  <text 
                    x={tick.x} 
                    y={svgHeight - paddingBottom + 20} 
                    className={styles.xLabel}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {/* Render Lines */}
              {items.map((item) => {
                const isVisible = visibleIds.includes(item.id);
                if (!isVisible) return null;

                const coords = getCoordinates(item.pointsHistory);
                let dPath = "";
                coords.forEach((pt, idx) => {
                  if (idx === 0) {
                    dPath += `M ${pt.x} ${pt.y}`;
                  } else {
                    dPath += ` L ${pt.x} ${pt.y}`;
                  }
                });

                return (
                  <g key={`line-group-${item.id}`} className={styles.seriesGroup}>
                    {/* Background glow path */}
                    <path
                      d={dPath}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.15"
                      style={{ filter: 'url(#glow)' }}
                    />
                    {/* Primary path */}
                    <path
                      d={dPath}
                      fill="none"
                      stroke={item.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.seriesLine}
                    />
                    {/* Data Point Circles */}
                    {coords.map((pt, idx) => {
                      const isHovered = hoveredPoint && hoveredPoint.id === item.id && hoveredPoint.roundIndex === idx;
                      return (
                        <circle
                          key={`dot-${item.id}-${idx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 3.5}
                          fill={item.color}
                          stroke="var(--bg-color)"
                          strokeWidth={isHovered ? 2 : 1}
                          className={styles.seriesDot}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            const roundDetails = idx === 0 ? { raceName: 'Start of Season', locality: '' } : rounds[idx - 1];
                            setHoveredPoint({
                              id: item.id,
                              name: item.name,
                              code: item.code,
                              constructorName: item.constructorName || (type === 'constructor' ? item.name : ''),
                              color: item.color,
                              roundIndex: idx,
                              roundName: idx === 0 ? 'Initial Standings' : `Round ${idx}: ${roundDetails.locality || roundDetails.raceName}`,
                              points: pt.val,
                              x: pt.x,
                              y: pt.y
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Tooltip Card */}
            {hoveredPoint && (
              <div 
                className={styles.tooltip}
                style={{ 
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: `${(hoveredPoint.y / svgHeight) * 100 - 15}%`,
                  borderColor: hoveredPoint.color
                }}
              >
                <div className={styles.tooltipRound}>{hoveredPoint.roundName}</div>
                <div className={styles.tooltipHeader}>
                  <div className={styles.tooltipTeamColor} style={{ backgroundColor: hoveredPoint.color }} />
                  <div className={styles.tooltipName}>
                    {hoveredPoint.name} {hoveredPoint.code && <span className={styles.tooltipCode}>{hoveredPoint.code}</span>}
                  </div>
                </div>
                {hoveredPoint.constructorName && (
                  <div className={styles.tooltipConstructor}>{hoveredPoint.constructorName}</div>
                )}
                <div className={styles.tooltipPoints}>
                  Points: <strong>{hoveredPoint.points}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Legend Grid */}
          <div className={styles.legendGrid}>
            {items.map((item) => {
              const isVisible = visibleIds.includes(item.id);
              return (
                <button
                  key={`legend-${item.id}`}
                  className={`${styles.legendItem} ${isVisible ? styles.legendItemActive : ''}`}
                  onClick={() => toggleLine(item.id)}
                >
                  <span 
                    className={styles.legendColorBox} 
                    style={{ 
                      backgroundColor: item.color,
                      boxShadow: isVisible ? `0 0 6px ${item.color}` : 'none'
                    }} 
                  />
                  <span className={styles.legendName}>
                    {item.code || item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
