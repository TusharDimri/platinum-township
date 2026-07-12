'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../styles/PlotSizeFilter.module.css';

const STEP = 5;

/**
 * Plot-size filter for the site map: a toggle pill + dropdown panel with a
 * dual-handle range slider over plot area (Sq. Yd.). Fully controlled —
 * SiteMapOverlay owns `value`/`open` and decides which pins to render from
 * the result, so this component has no effect on anything outside itself.
 */
export default function PlotSizeFilter({ bounds, value, onChange, open, onToggle, onRequestClose, matchCount, totalCount }) {
  const rootRef = useRef(null);
  const [activeThumb, setActiveThumb] = useState('hi');

  // Click/tap outside the toggle+panel closes just the panel — it must not
  // bubble to the map backdrop's own click handler (which would close the map).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        e.stopPropagation();
        onRequestClose();
      }
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true });
  }, [open, onRequestClose]);

  if (!bounds) return null;

  const { min, max } = bounds;
  const [lo, hi] = value;
  // "400+" mode: handle is at the one extra step beyond the visual cap (405).
  // At exactly 400 the label is a normal number; one step further shows "400+".
  const hiAtCap = hi >= max;                        // handle at the extra step (405)
  const capValue = max - STEP;                      // the visual cap value (400)
  const isActive = lo > min || !hiAtCap;            // active when lo moved OR hi not at cap
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;

  const setLo = (v) => onChange([Math.min(Number(v), hi - STEP), hi]);
  const setHi = (v) => onChange([lo, Math.max(Number(v), lo + STEP)]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.toggle} ${isActive ? styles.toggleActive : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={open}
        aria-label="Filter plots by size"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        <span className={styles.toggleLabel}>Plot Size</span>
        {isActive && <span className={styles.badge}>{matchCount}</span>}
      </button>

      {open && (
        <div className={styles.panel} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.kicker}>Filter</div>
              <div className={styles.panelTitle}>Plot Size</div>
            </div>
            <button
              type="button"
              className={styles.resetBtn}
              disabled={!isActive}
              onClick={() => onChange([min, max])}
            >
              Reset
            </button>
          </div>

          <div className={styles.countRow}>
            {matchCount === totalCount
              ? `All ${totalCount} plots`
              : `Showing ${matchCount} of ${totalCount} plots`}
          </div>

          <div className={styles.sliderWrap}>
            <div className={styles.track} />
            <div className={styles.range} style={{ left: `${loPct}%`, right: `${100 - hiPct}%` }} />
            <input
              type="range"
              className={styles.thumbInput}
              style={{ zIndex: activeThumb === 'lo' ? 5 : 3 }}
              min={min}
              max={max}
              step={STEP}
              value={lo}
              onPointerDown={() => setActiveThumb('lo')}
              onFocus={() => setActiveThumb('lo')}
              onChange={(e) => setLo(e.target.value)}
              aria-label="Minimum plot size"
            />
            <input
              type="range"
              className={styles.thumbInput}
              style={{ zIndex: activeThumb === 'hi' ? 5 : 4 }}
              min={min}
              max={max}
              step={STEP}
              value={hi}
              onPointerDown={() => setActiveThumb('hi')}
              onFocus={() => setActiveThumb('hi')}
              onChange={(e) => setHi(e.target.value)}
              aria-label="Maximum plot size"
            />
          </div>

          <div className={styles.labelsRow}>
            <span>{lo} Sq. Yd.</span>
            <span>{hiAtCap ? `${capValue}+ Sq. Yd.` : `${hi} Sq. Yd.`}</span>
          </div>

          {matchCount === 0 && <div className={styles.emptyNote}>No plots match this range.</div>}
        </div>
      )}
    </div>
  );
}
