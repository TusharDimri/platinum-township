'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../styles/NavChoiceOverlay.module.css';

/**
 * Shown when the visitor picks a scene on the map that isn't a direct neighbour
 * of where they're standing. Lets them choose between strolling there along the
 * township roads (the scenic walk) or hopping straight across (instant jump).
 *
 * Escape cancels (capture phase + stopImmediatePropagation so the walkthrough's
 * Escape→home binding never fires while the choice is open).
 */
export default function NavChoiceOverlay({ open, destinationName, onWalk, onJump, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Choose how to travel"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.card}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.28, ease: [0.34, 1.3, 0.64, 1] }}
          >
            <p className={styles.kicker}>Getting there</p>
            <h2 className={styles.title}>
              Travel to {destinationName || 'this spot'}
            </h2>
            <p className={styles.subtitle}>
              It&apos;s a little further out. Take the scenic stroll through the
              township, or hop straight across in a blink.
            </p>

            <div className={styles.actions}>
              <button className={styles.walkButton} onClick={onWalk} autoFocus>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="13" cy="4" r="2" />
                  <path d="M7 21l3-6 1-4 4 2 2 4M10 11l-2-3 4-2 3 3 2 1" />
                </svg>
                <span className={styles.btnText}>
                  <span className={styles.btnLabel}>Jump straight there</span>
                  <span className={styles.btnHint}>Skip ahead in an instant</span>
                </span>
              </button>

              <button className={styles.jumpButton} onClick={onJump}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" />
                </svg>
                <span className={styles.btnText}>
                  <span className={styles.btnLabel}>Walk the path</span>
                  <span className={styles.btnHint}>Stroll the streets along the way</span>
                </span>
              </button>
            </div>

            <button className={styles.cancelButton} onClick={onCancel}>
              Stay here
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
