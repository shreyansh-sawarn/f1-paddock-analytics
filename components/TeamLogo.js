import React from 'react';
import Image from 'next/image';
import styles from './TeamLogo.module.css';
import { getConstructorLogo, getConstructorLogoByName } from '@/lib/constructorLogos';

const SIZE_MAP = { sm: 20, md: 24, lg: 32 };

/**
 * TeamLogo — renders a small team badge/logo image inline.
 * Falls back to a colored circle with the team initial if no logo is found.
 *
 * @param {string} constructorId  - Ergast API constructor ID (preferred)
 * @param {string} constructorName - Constructor display name (fallback lookup)
 * @param {string} size           - 'sm' (20px), 'md' (24px), or 'lg' (32px)
 */
export default function TeamLogo({ constructorId, constructorName, size = 'md' }) {
  const logoUrl = getConstructorLogo(constructorId) || getConstructorLogoByName(constructorName);

  const sizeClass = styles[size] || styles.md;
  const px = SIZE_MAP[size] || 24;

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={constructorName || constructorId || 'Team logo'}
        width={px}
        height={px}
        className={`${styles.logo} ${sizeClass}`}
        loading="lazy"
        draggable={false}
        unoptimized
      />
    );
  }

  // Fallback: coloured circle with initial letter
  const initial = (constructorName || constructorId || '?').charAt(0).toUpperCase();
  return (
    <span className={`${styles.fallback} ${sizeClass}`} title={constructorName || constructorId}>
      {initial}
    </span>
  );
}
