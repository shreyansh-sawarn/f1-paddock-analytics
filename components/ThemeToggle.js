"use client";
import React, { useState, useEffect } from 'react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check theme on mount
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = savedTheme || systemTheme;
    const timeout = setTimeout(() => {
      setTheme(activeTheme);
    }, 0);
    document.documentElement.setAttribute('data-theme', activeTheme);
    return () => clearTimeout(timeout);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className={styles.toggleWrapper} onClick={toggleTheme} aria-label="Toggle theme">
      <span className={styles.icon}>☀️</span>
      <div className={`${styles.switch} ${theme === 'dark' ? styles.dark : ''}`}>
        <div className={styles.handle}></div>
      </div>
      <span className={styles.icon}>🌙</span>
    </div>
  );
}
