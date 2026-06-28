"use client";
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { Oswald } from 'next/font/google';
import styles from './AppLayout.module.css';

const oswald = Oswald({ subsets: ["latin"], weight: ["700"] });

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync state with localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState === 'true') {
      const timeout = setTimeout(() => {
        setIsCollapsed(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  return (
    <div className="layout-wrapper">
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
      <div className={styles.contentContainer}>
        <header className={styles.topHeader}>
          <div className={`${styles.logoWrapper} ${!isCollapsed ? styles.desktopHidden : ''}`}>
            <div className={styles.lightsContainer}>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
              <div className={styles.light}></div>
            </div>
            <span className={`${styles.logoText} ${oswald.className}`}>
              Paddock Analytics
            </span>
          </div>
          <div className={styles.topToggle}>
            <ThemeToggle />
          </div>
        </header>
        <main className={`${styles.mainContent} page-transition`} key={pathname}>
          {children}
        </main>
        <footer className={styles.mobileFooter}>
          Made with ❤️ by Shreyansh.
        </footer>
      </div>
    </div>
  );
}
