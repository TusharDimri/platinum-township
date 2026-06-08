'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { scenes } from './data/scenes';

export default function LandingPage() {
  const router = useRouter();
  const [bgIndex, setBgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState([]);

  // Generate particles only on client to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDuration: `${3 + Math.random() * 4}s`,
        animationDelay: `${Math.random() * 3}s`,
        width: `${2 + Math.random() * 3}px`,
        height: `${2 + Math.random() * 3}px`,
      }))
    );
  }, []);

  // Cycle through panorama thumbnails as background
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % scenes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.page}>
      {/* Animated background panoramas */}
      <div className={styles.bgContainer}>
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`${styles.bgImage} ${index === bgIndex ? styles.bgImageActive : ''}`}
            style={{ backgroundImage: `url(${scene.panoramaUrl})` }}
          />
        ))}
        <div className={styles.bgOverlay} />
        <div className={styles.bgGradient} />
      </div>

      {/* Floating particles */}
      <div className={styles.particles}>
        {particles.map((p) => (
          <div
            key={p.id}
            className={styles.particle}
            style={{
              left: p.left,
              top: p.top,
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay,
              width: p.width,
              height: p.height,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className={styles.content}>
        {/* Badge */}
        <motion.div
          className={styles.badge}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <span className={styles.badgeDot} />
          <span>Virtual Experience</span>
        </motion.div>

        {/* Logo */}
        <motion.div
          className={styles.logo}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 4L4 16V32L24 44L44 32V16L24 4Z"
              stroke="url(#landingGrad)"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M24 4V44M4 16L44 32M44 16L4 32"
              stroke="url(#landingGrad)"
              strokeWidth="1"
              opacity="0.4"
            />
            <defs>
              <linearGradient id="landingGrad" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#c8a44e" />
                <stop offset="0.5" stopColor="#38bdf8" />
                <stop offset="1" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Title */}
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          Platinum Township
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          Explore our meticulously crafted township through an immersive
          3D walkthrough experience. Navigate through {scenes.length} stunning
          panoramic viewpoints and a full dollhouse model.
        </motion.p>

        {/* Stats */}
        <motion.div
          className={styles.stats}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          <div className={styles.stat}>
            <span className={styles.statValue}>{scenes.length}</span>
            <span className={styles.statLabel}>Viewpoints</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>360°</span>
            <span className={styles.statLabel}>Panoramic</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>3D</span>
            <span className={styles.statLabel}>Dollhouse</span>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          className={styles.ctaButton}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/walkthrough')}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className={styles.ctaText}>Explore Township</span>
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </motion.svg>
          <span className={styles.ctaGlow} />
        </motion.button>

        {/* Keyboard hint */}
        <motion.p
          className={styles.hint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          Press <kbd className={styles.kbd}>Enter</kbd> or click to begin
        </motion.p>
      </div>

      {/* Bottom decoration */}
      <div className={styles.bottomBar}>
        <span>Platinum Township © 2025</span>
        <span className={styles.bottomDot} />
        <span>Immersive Virtual Tour</span>
      </div>
    </div>
  );
}
