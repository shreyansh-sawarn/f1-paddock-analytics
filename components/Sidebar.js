"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Oswald } from 'next/font/google';
import styles from './Sidebar.module.css';

const oswald = Oswald({ subsets: ["latin"], weight: ["700"] });

// SVGs for navigation icons
const ScheduleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ResultsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

const StandingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M18 20V4M6 20v-6" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
    <rect x="1" y="3" width="22" height="5" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const CircuitsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="3" />
  </svg>
);

const F1Icon = ({ className, size = 'small' }) => {
  const width = size === 'large' ? '56' : '36';
  const height = size === 'large' ? '14' : '9';
  return (
    <svg 
      className={className} 
      viewBox="0 9 24 6" 
      width={width} 
      height={height} 
      style={{ 
        display: 'inline-block', 
        verticalAlign: 'middle',
        marginRight: size === 'large' ? '0' : '0.4rem'
      }}
    >
      <path 
        d="M9.6 11.24h7.91L19.75 9H9.39c-2.85 0-3.62.34-5.17 1.81C2.71 12.3 0 15 0 15h3.38c.77-.75 2.2-2.13 2.85-2.75.92-.87 1.37-1.01 3.37-1.01zM20.39 9l-6 6H18l6-6h-3.61zm-3.25 2.61H9.88c-2.22 0-2.6.12-3.55 1.07C5.44 13.57 4 15 4 15h3.15l.75-.75c.49-.49.75-.55 1.78-.55h5.37l2.09-2.09z" 
        fill="var(--f1-red)" 
      />
    </svg>
  );
};

const CollapseIcon = ({ isCollapsed }) => (
  <svg 
    width="10" 
    height="10" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.8" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {isCollapsed ? (
      <polyline points="9 18 15 12 9 6" />
    ) : (
      <polyline points="15 18 9 12 15 6" />
    )}
  </svg>
);

export default function Sidebar({ isCollapsed, toggleCollapse }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Schedule", path: "/", icon: <ScheduleIcon /> },
    { name: "Results", path: "/results", icon: <ResultsIcon /> },
    { name: "Standings", path: "/standings", icon: <StandingsIcon /> },
    { name: "Archive", path: "/archive", icon: <ArchiveIcon /> },
    { name: "Circuits", path: "/circuits", icon: <CircuitsIcon /> }
  ];

  return (
    <>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <div className={styles.lightsContainer}>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
            </div>
            <h1 className={`${styles.logoText} ${oswald.className}`}>
              F1 Paddock Analytics
            </h1>
          </div>
          <button 
            className={styles.collapseBtn} 
            onClick={toggleCollapse} 
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <CollapseIcon isCollapsed={isCollapsed} />
          </button>
        </div>
        
        <div className={styles.navGroup}>
          <h3 className={styles.navTitle}>
            <F1Icon size={isCollapsed ? "large" : "small"} className={styles.navTitleIcon} />
            <span className={styles.navTitleText}>FORMULA 1</span>
          </h3>
          <ul className={styles.navList}>
            {navItems.map(item => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.path} 
                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <span className={`${styles.navIconWrapper} ${isActive ? styles.activeIcon : ''}`}>
                      {item.icon}
                    </span>
                    <span className={styles.navName}>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.footer}>
          <span className={styles.footerText}>Made with ❤️ by Shreyansh.</span>
          <span className={styles.footerHeart}>❤️</span>
        </div>
      </aside>

      <nav className={styles.mobileNav}>
        {navItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.name}
              href={item.path} 
              className={`${styles.mobileNavItem} ${isActive ? styles.mobileActive : ''}`}
            >
              <span className={`${styles.mobileIconWrapper} ${isActive ? styles.mobileActiveIcon : ''}`}>
                {item.icon}
              </span>
              <span className={styles.mobileNavName}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
