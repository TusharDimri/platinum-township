'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BrandMark from './BrandMark';
import styles from '../styles/LoadingScreen.module.css';

export default function LoadingScreen({ progress, isLoading }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Smooth progress animation
    const timer = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= progress) {
          clearInterval(timer);
          return progress;
        }
        return prev + 1;
      });
    }, 20);
    return () => clearInterval(timer);
  }, [progress]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className={styles.loadingScreen}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <div className={styles.content}>
            {/* Animated background orbs */}
            <div className={styles.orbContainer}>
              <div className={`${styles.orb} ${styles.orb1}`} />
              <div className={`${styles.orb} ${styles.orb2}`} />
              <div className={`${styles.orb} ${styles.orb3}`} />
            </div>

            {/* Logo / Brand */}
            <motion.div
              className={styles.brand}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <div className={styles.logoFloat}>
                <BrandMark size="lg" />
              </div>
              <p className={styles.subtitle}>Immersive 3D Experience</p>
            </motion.div>

            {/* Progress */}
            <motion.div
              className={styles.progressContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <div className={styles.progressBar}>
                <motion.div
                  className={styles.progressFill}
                  initial={{ width: '0%' }}
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
                <div className={styles.progressGlow} style={{ left: `${displayProgress}%` }} />
              </div>
              <div className={styles.progressInfo}>
                <span className={styles.progressText}>Loading assets</span>
                <span className={styles.progressPercent}>{Math.round(displayProgress)}%</span>
              </div>
            </motion.div>

            {/* Loading hints */}
            <motion.p
              className={styles.hint}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              Preparing your virtual walkthrough experience...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
