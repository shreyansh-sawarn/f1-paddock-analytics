"use client";
import React, { useState } from 'react';
import styles from './CostCapChart.module.css';
import TeamLogo from './TeamLogo';

// Realistic estimated annual budgets (including exemptions like driver salaries & marketing)
const ESTIMATED_BUDGETS_BY_YEAR = {
  // Pre-cost cap era (Huge discrepancies)
  defaultPre2021: {
    mercedes: 450, ferrari: 460, red_bull: 440, mclaren: 250, alpine: 240, 
    renault: 240, aston_martin: 140, racing_point: 140, force_india: 130,
    sauber: 130, alfa: 130, haas: 110, williams: 150, toro_rosso: 140, alpha_tauri: 140
  },
  // Cost cap era (Exemptions still create minor gaps)
  defaultPost2020: {
    mercedes: 215, ferrari: 220, red_bull: 210, mclaren: 175, alpine: 160,
    renault: 160, aston_martin: 165, racing_point: 165, sauber: 140,
    alfa: 140, haas: 135, williams: 140, alpha_tauri: 140, rb: 145, audi: 145
  }
};

export default function CostCapChart({ wccData, season }) {
  const [hoveredTeam, setHoveredTeam] = useState(null);

  if (!wccData || wccData.length === 0) return null;

  const isPostCostCap = parseInt(season, 10) >= 2021;
  const budgetTemplate = isPostCostCap 
    ? ESTIMATED_BUDGETS_BY_YEAR.defaultPost2020 
    : ESTIMATED_BUDGETS_BY_YEAR.defaultPre2021;

  // Map constructor data and estimate budgets
  const teamsData = wccData.map(team => {
    const key = team.constructorId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    // Find closest match or assign dynamic default based on ranking
    let budget = budgetTemplate[key];
    if (!budget) {
      // Procedural fallback budget
      if (team.position === "1" || team.position === "2") {
        budget = isPostCostCap ? 210 : 430;
      } else if (parseInt(team.position) <= 5) {
        budget = isPostCostCap ? 170 : 230;
      } else {
        budget = isPostCostCap ? 140 : 130;
      }
    }

    const points = parseFloat(team.points) || 0;
    const efficiency = budget > 0 ? (points / budget) * 10 : 0; // Points per $10M

    // Determine efficiency verdict
    let verdict = "Optimal Return";
    let verdictColor = "#39ff14";
    if (efficiency >= 15) {
      verdict = "Exceptional ROI";
      verdictColor = "#00ffff";
    } else if (efficiency >= 7) {
      verdict = "High Efficiency";
      verdictColor = "#39ff14";
    } else if (efficiency >= 3) {
      verdict = "Moderate Efficiency";
      verdictColor = "#ffd300";
    } else {
      verdict = "Underperforming Asset";
      verdictColor = "#ff1801";
    }

    return {
      ...team,
      budget,
      points,
      efficiency,
      verdict,
      verdictColor
    };
  });

  // Chart boundaries
  const maxPoints = Math.max(...teamsData.map(t => t.points), 50);
  const minBudget = Math.min(...teamsData.map(t => t.budget), 100) - 20;
  const maxBudget = Math.max(...teamsData.map(t => t.budget), 250) + 20;

  // Mid-points for quadrant division
  const midPoints = maxPoints / 2;
  const midBudget = (minBudget + maxBudget) / 2;

  // Convert stats to percentage coordinates for plotting
  const getCoords = (budget, points) => {
    const x = ((budget - minBudget) / (maxBudget - minBudget)) * 85 + 7.5;
    const y = 90 - (points / maxPoints) * 80;
    return { x, y };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Constructor Cost-to-Performance Index</h3>
        <p className={styles.description}>
          Analyzing championship value for money. Scatter points map <strong>Estimated Budget ($M)</strong> vs. <strong>Points Output</strong>.
        </p>
      </div>

      <div className={styles.chartWrapper}>
        <div className={styles.chartArea}>
          {/* Quadrant Labels */}
          <div className={`${styles.quadLabel} ${styles.quadTopLeft}`}>
            <span className={styles.quadTitle}>Underdog Heroes</span>
            <span className={styles.quadSubtitle}>Low Budget / High Return</span>
          </div>
          <div className={`${styles.quadLabel} ${styles.quadTopRight}`}>
            <span className={styles.quadTitle}>Heavy Hitters</span>
            <span className={styles.quadSubtitle}>Expected Giants Output</span>
          </div>
          <div className={`${styles.quadLabel} ${styles.quadBottomLeft}`}>
            <span className={styles.quadTitle}>Frugal / Developing</span>
            <span className={styles.quadSubtitle}>Low Cost / Long-term Build</span>
          </div>
          <div className={`${styles.quadLabel} ${styles.quadBottomRight}`}>
            <span className={styles.quadTitle}>Low ROI / Inefficient</span>
            <span className={styles.quadSubtitle}>High Expenditure / Low Return</span>
          </div>

          {/* Grid lines & Axes */}
          <svg className={styles.chartSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Midline horizontal (points split) */}
            <line x1="5" y1="50" x2="95" y2="50" className={styles.gridLine} strokeDasharray="3,3" />
            {/* Midline vertical (budget split) */}
            <line x1="50" y1="10" x2="50" y2="90" className={styles.gridLine} strokeDasharray="3,3" />
          </svg>

          {/* Scatter Points */}
          {teamsData.map((team, idx) => {
            const { x, y } = getCoords(team.budget, team.points);
            const isHovered = hoveredTeam?.constructorId === team.constructorId;

            return (
              <div
                key={team.constructorId}
                className={`${styles.scatterPoint} ${isHovered ? styles.activePoint : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setHoveredTeam(team)}
                onMouseLeave={() => setHoveredTeam(null)}
              >
                <div className={styles.pointDot} style={{ backgroundColor: team.verdictColor }}>
                  <span className={styles.pointLabel}>{team.constructorName.substring(0, 3).toUpperCase()}</span>
                </div>

                {/* Team Tooltip */}
                {isHovered && (
                  <div className={styles.tooltip}>
                    <div className={styles.tooltipHeader}>
                      <TeamLogo constructorId={team.constructorId} constructorName={team.constructorName} size="sm" />
                      <span className={styles.teamName}>{team.constructorName}</span>
                    </div>
                    <div className={styles.tooltipBody}>
                      <div className={styles.tooltipRow}>
                        <span>Points:</span>
                        <strong>{team.points} pts</strong>
                      </div>
                      <div className={styles.tooltipRow}>
                        <span>Est. Budget:</span>
                        <strong>${team.budget}M</strong>
                      </div>
                      <div className={styles.tooltipRow}>
                        <span>Efficiency:</span>
                        <span style={{ color: team.verdictColor }}>
                          {(team.efficiency).toFixed(2)} pts / $10M
                        </span>
                      </div>
                      <div className={styles.verdictBadge} style={{ borderColor: team.verdictColor, color: team.verdictColor }}>
                        {team.verdict}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / Axes description */}
        <div className={styles.axesLabels}>
          <div className={styles.axisX}>Budget Spent ($ Millions) &rarr;</div>
          <div className={styles.axisY}>&larr; Points Scored</div>
        </div>
      </div>

      {/* Leaderboard list of efficiency ratings */}
      <div className={styles.efficiencyLeaderboard}>
        <h4 className={styles.leaderboardTitle}>Efficiency Rankings</h4>
        <div className={styles.leaderboardGrid}>
          {teamsData
            .sort((a, b) => b.efficiency - a.efficiency)
            .map((team, index) => (
              <div key={team.constructorId} className={styles.leaderboardRow}>
                <span className={styles.rank}>#{index + 1}</span>
                <span className={styles.teamNameCell}>
                  <TeamLogo constructorId={team.constructorId} constructorName={team.constructorName} size="sm" />
                  {team.constructorName}
                </span>
                <span className={styles.efficiencyVal}>
                  <strong>{(team.efficiency).toFixed(1)}</strong> pts / $10M
                </span>
                <span className={styles.ratingBadge} style={{ backgroundColor: `${team.verdictColor}20`, color: team.verdictColor }}>
                  {team.verdict}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
