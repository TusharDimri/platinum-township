'use client';

import { useState, useEffect } from 'react';

export default function AdminRotationHelper({ currentScene }) {
  const [isActive, setIsActive] = useState(false);
  const [localYaw, setLocalYaw] = useState(0);

  useEffect(() => {
    if (currentScene) {
      setLocalYaw(currentScene.yawOffset || 0);
    }
  }, [currentScene]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key === 'R') {
        setIsActive(prev => !prev);
      }

      if (!isActive) return;

      if (e.key === 'ArrowLeft') {
        setLocalYaw(prev => {
          const val = prev + 0.05;
          console.log(`[${currentScene.id}] new yawOffset: ${val.toFixed(3)}`);
          return val;
        });
      }
      if (e.key === 'ArrowRight') {
        setLocalYaw(prev => {
          const val = prev - 0.05;
          console.log(`[${currentScene.id}] new yawOffset: ${val.toFixed(3)}`);
          return val;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentScene]);

  // Dynamically update the scene's offset in memory just for testing visually
  useEffect(() => {
    if (currentScene && isActive) {
      currentScene.yawOffset = localYaw;
    }
  }, [localYaw, currentScene, isActive]);

  if (!isActive) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)',
      color: '#0f0',
      padding: '0.5rem 1rem',
      borderRadius: '8px',
      fontFamily: 'monospace',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      DEV: [{currentScene.id}] yawOffset: {localYaw.toFixed(3)}
      <div style={{ fontSize: '0.7rem', color: '#fff' }}>Use Left/Right arrows to rotate. Shift+R to exit.</div>
    </div>
  );
}
