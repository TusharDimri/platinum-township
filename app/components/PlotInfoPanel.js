'use client';

import { useEffect } from 'react';
import styles from '../styles/PlotInfoPanel.module.css';

const FIELD_LABELS = [
  ['area', 'Plot Area'],
  ['front', 'Front'],
  ['rear', 'Rear'],
  ['depthR', 'Depth R'],
  ['depthL', 'Depth L'],
  ['gardenArea', 'Private Garden Area'],
  // ['dimensions', 'Dimensions'],
  // ['facing', 'Facing'],
  // ['price', 'Price'],
];

/**
 * Slide-in overlay with a plot's full details, opened by clicking a plot tag.
 */
export default function PlotInfoPanel({ plot, onClose }) {
  // Escape closes the panel only — capture phase + stopImmediatePropagation so the
  // walkthrough page's Escape→home binding doesn't fire while the panel is open.
  useEffect(() => {
    if (!plot) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [plot, onClose]);

  if (!plot) return null;

  const { info = {} } = plot;
  const status = info.status || 'Available';
  const statusClass = styles[`status_${status.toLowerCase()}`] || styles.status_available;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside className={styles.panel} aria-label={`Details for ${plot.name}`}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Plot Details</p>
            <h2 className={styles.title}>{plot.name}</h2>
          </div>
          <span className={`${styles.statusChip} ${statusClass}`}>{status}</span>
        </header>

        <div className={styles.rows}>
          {FIELD_LABELS.map(([key, label]) =>
            info[key] ? (
              <div className={styles.row} key={key}>
                <span className={styles.rowLabel}>{label}</span>
                <span className={styles.rowValue}>{info[key]}</span>
              </div>
            ) : null
          )}
        </div>

        {info.description && <p className={styles.description}>{info.description}</p>}

        <button className={styles.closeButton} onClick={onClose} aria-label="Close plot details">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </aside>
    </>
  );
}
