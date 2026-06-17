'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSceneNavigation } from '../hooks/useSceneNavigation';
import { areScenesAdjacent } from '../data/scenes';
import LoadingScreen from '../components/LoadingScreen';
import MiniMap from '../components/MiniMap';
import PlotInfoPanel from '../components/PlotInfoPanel';
import NavChoiceOverlay from '../components/NavChoiceOverlay';
import styles from './walkthrough.module.css';

const PanoramaViewer = dynamic(
  () => import('../components/PanoramaViewer'),
  { ssr: false }
);

const AdminRotationHelper = process.env.NODE_ENV !== 'production'
  ? dynamic(() => import('../components/AdminRotationHelper'), { ssr: false })
  : () => null;

export default function WalkthroughPage() {
  // Live camera yaw shared from the 3D canvas to the minimap's facing cone and
  // the walk orchestrator, updated every frame via a ref to avoid re-rendering
  // React at 60fps.
  const cameraYawRef = useRef(0);
  const [activePlot, setActivePlot] = useState(null);
  // Scene id the visitor picked on the map that's NOT a direct neighbour — holds
  // the jump-or-walk chooser open until they decide (null = no prompt).
  const [pendingSceneId, setPendingSceneId] = useState(null);

  const {
    currentScene,
    incomingSceneId,
    adjacentScenes,
    isTransitioning,
    isWalking,
    panYaw,
    isLoading,
    loadingProgress,
    allScenes,
    targetYaw,
    navigateToScene,
    goHome,
    onLoadComplete,
    updateLoadingProgress,
  } = useSceneNavigation(cameraYawRef);

  const incomingScene = incomingSceneId ? allScenes.find(s => s.id === incomingSceneId) : null;

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

  const handlePanoramaNavigate = useCallback((sceneId) => {
    setActivePlot(null); // Close plot info if navigating away
    navigateToScene(sceneId);
  }, [navigateToScene]);

  // Map (radar + full site map) scene clicks route through here. Direct
  // neighbours just walk one hop; anything further opens the jump-or-walk
  // chooser so the visitor decides how to travel.
  const handleMapSceneSelect = useCallback((sceneId) => {
    const fromId = currentScene?.id;
    if (!sceneId || sceneId === fromId) return;
    if (areScenesAdjacent(fromId, sceneId)) {
      setActivePlot(null);
      navigateToScene(sceneId);
    } else {
      setPendingSceneId(sceneId);
    }
  }, [currentScene?.id, navigateToScene]);

  const confirmWalk = useCallback(() => {
    const id = pendingSceneId;
    setPendingSceneId(null);
    if (id) {
      setActivePlot(null);
      navigateToScene(id);
    }
  }, [pendingSceneId, navigateToScene]);

  const confirmJump = useCallback(() => {
    const id = pendingSceneId;
    setPendingSceneId(null);
    if (id) {
      setActivePlot(null);
      navigateToScene(id, { direct: true });
    }
  }, [pendingSceneId, navigateToScene]);

  const cancelPending = useCallback(() => setPendingSceneId(null), []);
  const closePlot = useCallback(() => setActivePlot(null), []);

  const pendingSceneName = useMemo(
    () => (pendingSceneId ? allScenes.find((s) => s.id === pendingSceneId)?.name : null),
    [pendingSceneId, allScenes]
  );

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
                isWalking={isWalking}
                panYaw={panYaw}
                cameraYawRef={cameraYawRef}
                activePlot={activePlot}
                onPlotSelect={setActivePlot}
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
          onSceneSelect={handleMapSceneSelect}
          cameraYawRef={cameraYawRef}
          adjacentScenes={adjacentScenes}
          onPlotSelect={setActivePlot}
          plotOpen={!!activePlot}
        />
      )}

      {/* Plot details live at the top level so they layer above the full site
          map — letting the visitor open the map, inspect a plot, close it, and
          pick another without the map ever closing. */}
      <PlotInfoPanel plot={activePlot} onClose={closePlot} />

      <NavChoiceOverlay
        open={!!pendingSceneId}
        destinationName={pendingSceneName}
        onWalk={confirmWalk}
        onJump={confirmJump}
        onCancel={cancelPending}
      />
    </div>
  );
}
