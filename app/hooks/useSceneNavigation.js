'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { scenes, getSceneById, getAdjacentScenes, DEFAULT_SCENE } from '../data/scenes';

export function useSceneNavigation() {
  const router = useRouter();
  const [currentSceneId, setCurrentSceneId] = useState(DEFAULT_SCENE);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [targetYaw, setTargetYaw] = useState(null);

  const [incomingSceneId, setIncomingSceneId] = useState(null);

  const transitionTimeoutRef = useRef(null);

  const currentScene = getSceneById(currentSceneId);
  const adjacentScenes = getAdjacentScenes(currentSceneId);

  const navigateToScene = useCallback((sceneId, newTargetYaw = null) => {
    if (isTransitioning || sceneId === currentSceneId) return;

    setIsTransitioning(true);
    setIncomingSceneId(sceneId);
    setTargetYaw(newTargetYaw);

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // The screen is dimmed by ~200ms (see .walkVignette); swap the scene here, while
    // it's fully covered, then the dim fades back in on the new scene. Keep this in
    // sync with the fade timing so the camera's angle snap is never visible.
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentSceneId(sceneId);
      setIncomingSceneId(null);
      setIsTransitioning(false);
    }, 420);
  }, [isTransitioning, currentSceneId]);

  const goHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const onLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const updateLoadingProgress = useCallback((progress) => {
    setLoadingProgress(Math.min(progress, 100));
  }, []);

  return {
    currentScene,
    currentSceneId,
    incomingSceneId,
    adjacentScenes,
    isTransitioning,
    isLoading,
    loadingProgress,
    allScenes: scenes,
    targetYaw,

    navigateToScene,
    goHome,
    onLoadComplete,
    updateLoadingProgress,
  };
}
