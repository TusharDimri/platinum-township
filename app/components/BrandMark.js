'use client';

import styles from '../styles/BrandMark.module.css';

/**
 * The canonical Platinum Township lockup: the logo PNG with the wordmark set in
 * the display font to its right. No decorative background — just the mark.
 * Use everywhere the brand appears so it stays uniform across the app.
 *
 * size: 'sm' | 'md' | 'lg'
 */
export default function BrandMark({ size = 'md', showName = true, className = '' }) {
  return (
    <span className={`${styles.brand} ${styles[size]} ${className}`}>
      <img src="/Logo.png" alt="Platinum Township" className={styles.logo} />
      {showName && <span className={styles.name}>Platinum Township</span>}
    </span>
  );
}
