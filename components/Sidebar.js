"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Oswald } from 'next/font/google';
import styles from './Sidebar.module.css';

const oswald = Oswald({ subsets: ["latin"], weight: ["700"] });

export default function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Schedule", path: "/" },
    { name: "Results", path: "/results" },
    { name: "Standings", path: "/standings" },
    { name: "Archive", path: "/archive" }
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h1 className={`${styles.logo} ${oswald.className}`}>
          <div className={styles.lightsContainer}>
            <div className={styles.light}></div>
            <div className={styles.light}></div>
            <div className={styles.light}></div>
            <div className={styles.light}></div>
            <div className={styles.light}></div>
          </div>
          Paddock Analytics
        </h1>
      </div>
      
      <div className={styles.navGroup}>
        <h3 className={styles.navTitle}>FORMULA 1</h3>
        <ul className={styles.navList}>
          {navItems.map(item => {
            const isActive = pathname === item.path;
            return (
              <li key={item.name} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
                <Link href={item.path} style={{ display: 'flex', alignItems: 'center', width: '100%', color: 'inherit', textDecoration: 'none' }}>
                  <span className={`${styles.seriesIcon} ${isActive ? styles.activeIcon : ''}`}></span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.footer}>
        Made with ❤️ by Shreyansh.
      </div>
    </aside>
  );
}
