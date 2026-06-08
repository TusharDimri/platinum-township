'use client';

import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSceneNavigation } from '../hooks/useSceneNavigation';
import LoadingScreen from '../components/LoadingScreen';
import MiniMap from '../components/MiniMap';
import styles from './walkthrough.module.css';

const PanoramaViewer = dynamic(
  () => import('../components/PanoramaViewer'),
  { ssr: false }
);

const AdminRotationHelper = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('../components/AdminRotationHelper'), { ssr: false })
  : () => null;

export default function WalkthroughPage() {
  const {
    currentScene,
    incomingSceneId,
    adjacentScenes,
    isTransitioning,
    isLoading,
    loadingProgress,
    allScenes,
    targetYaw,
    navigateToScene,
    goHome,
    onLoadComplete,
    updateLoadingProgress,
  } = useSceneNavigation();

  const incomingScene = incomingSceneId ? allScenes.find(s => s.id === incomingSceneId) : null;

  // Live camera yaw shared from the 3D canvas to the minimap's facing cone,
  // updated every frame via a ref to avoid re-rendering React at 60fps.
  const cameraYawRef = useRef(0);

  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(onLoadComplete, 500);
      }
      updateLoadingProgress(progress);
    }, 300);
    return () => clearInterval(interval);
  }, [onLoadComplete, updateLoadingProgress]);

  const handlePanoramaNavigate = useCallback((sceneId, yaw) => {
    navigateToScene(sceneId, yaw);
  }, [navigateToScene]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        goHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goHome]);

  return (
    <div className={styles.walkthroughContainer}>
      <AdminRotationHelper currentScene={currentScene} />

      <LoadingScreen progress={loadingProgress} isLoading={isLoading} />

      {!isLoading && (
        <div className={styles.viewerContainer}>
          <div className={`${styles.viewLayer} ${styles.viewLayerActive}`}>
            {currentScene && (
              <PanoramaViewer
                currentScene={currentScene}
                incomingScene={incomingScene}
                adjacentScenes={adjacentScenes}
                onNavigate={handlePanoramaNavigate}
                onBack={goHome}
                targetYaw={targetYaw}
                isTransitioning={isTransitioning}
                cameraYawRef={cameraYawRef}
              />
            )}
          </div>
        </div>
      )}

      {!isLoading && (
        <MiniMap
          scenes={allScenes}
          currentScene={currentScene}
          currentSceneId={currentScene?.id}
          onSceneSelect={(id) => navigateToScene(id)}
          cameraYawRef={cameraYawRef}
          adjacentScenes={adjacentScenes}
        />
      )}
    </div>
  );
}
