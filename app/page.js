'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import BrandMark from './components/BrandMark';
import styles from './page.module.css';
import { scenes } from './data/scenes';

export default function LandingPage() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const viewpointCount = scenes.filter((s) => s.type === 'ground').length;

  const begin = useCallback(() => {
    router.push('/walkthrough');
  }, [router]);

  // The hint promises "Press Enter" — honour it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') begin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [begin]);

  return (
    <div className={styles.page}>
      {/* Soft brand-coloured ambience — kept very subtle for a clean, premium feel */}
      <div className={styles.ambience} aria-hidden="true">
        <span className={styles.orbSage} />
        <span className={styles.orbSand} />
      </div>

      {/* Minimal top bar */}
      <header className={styles.topbar}>
        <BrandMark size="sm" />
        <span className={styles.topbarTag}>Virtual Experience</span>
      </header>

      {/* Hero */}
      <main className={styles.content}>
        <motion.span
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Immersive 3D Walkthrough
        </motion.span>

        <motion.div
          className={styles.logoWrap}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src="/Logo.png" alt="Platinum Township" className={styles.logo} />
        </motion.div>

        {/* <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Platinum Township
        </motion.h1> */}

        <motion.span
          className={styles.titleRule}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.7 }}
        />

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.8 }}
        >
          A meticulously crafted living environment, presented as an immersive
          virtual tour. Move naturally between {viewpointCount} panoramic
          viewpoints and take in every detail in full 360°.
        </motion.p>

        <motion.div
          className={styles.stats}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <div className={styles.stat}>
            <span className={styles.statValue}>{viewpointCount}</span>
            <span className={styles.statLabel}>Viewpoints</span>
          </div>
          <span className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>360°</span>
            <span className={styles.statLabel}>Panoramic</span>
          </div>
          <span className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>3D</span>
            <span className={styles.statLabel}>Immersive</span>
          </div>
        </motion.div>

        <motion.button
          className={styles.cta}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.8 }}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0, scale: 0.99 }}
          onClick={begin}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span>Explore Township</span>
          <motion.svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </motion.svg>
        </motion.button>

        <motion.p
          className={styles.hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          Press <kbd className={styles.kbd}>Enter</kbd> or click to begin
        </motion.p>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>Platinum Township © 2025</span>
        <span className={styles.footerDot} />
        <span>Immersive Virtual Tour</span>
      </footer>
    </div>
  );
}
