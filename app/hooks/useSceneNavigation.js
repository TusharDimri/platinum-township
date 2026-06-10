'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  scenes,
  sceneAdjacency,
  getSceneById,
  getAdjacentScenes,
  getArrivalYaw,
  DEFAULT_SCENE,
} from '../data/scenes';

// One hop: the destination panorama crossfades in over the current one while the
// camera glides forward, then the scene swap (the "cut") happens. The crossfade
// in PanoramaViewer must complete within this window.
export const TRANSITION_MS = 1100;

// Before each hop the camera pans to face the travel direction (the hotspot you
// are about to walk through) — walking always happens ALONG the view axis, which
// is what makes it read as walking. Pan time scales with how far it must turn.
const PAN_MS_MIN = 150;
const PAN_MS_MAX = 750;
// Pause at each waypoint of a multi-hop walk before turning toward the next one.
const HOP_DWELL_MS = 180;

function shortestDelta(target, current) {
  let d = (target - current) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

// BFS through the authored hotspot graph; returns [from, ..., to] or null.
function findPath(fromId, toId) {
  if (fromId === toId) return [fromId];
  const queue = [[fromId]];
  const visited = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift();
    for (const edge of sceneAdjacency[path[path.length - 1]] || []) {
      if (visited.has(edge.id)) continue;
      const next = [...path, edge.id];
      if (edge.id === toId) return next;
      visited.add(edge.id);
      queue.push(next);
    }
  }
  return null;
}

/**
 * Navigation state + the walk orchestrator.
 *
 * `navigateToScene(targetId)` walks there like a person would: it finds the
 * hotspot path (BFS), and for every hop it (1) pans the camera to face the
 * doorway, (2) runs the forward crossfade transition, (3) dwells a beat at the
 * waypoint, and repeats — so clicking a far scene on the minimap produces a
 * visible journey along the roads, not a teleport.
 */
export function useSceneNavigation(cameraYawRef) {
  const router = useRouter();
  const [currentSceneId, setCurrentSceneId] = useState(DEFAULT_SCENE);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [targetYaw, setTargetYaw] = useState(null);
  const [panYaw, setPanYaw] = useState(null);
  const [incomingSceneId, setIncomingSceneId] = useState(null);

  const walkingRef = useRef(false);
  const timeoutsRef = useRef([]);

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const currentScene = getSceneById(currentSceneId);
  const adjacentScenes = getAdjacentScenes(currentSceneId);

  const finishWalk = useCallback(() => {
    walkingRef.current = false;
    setIsWalking(false);
    setPanYaw(null);
  }, []);

  // One hop of a walk: pan to face the hotspot, then transition, then either
  // continue down the remaining path or finish.
  const performHop = useCallback(
    (fromId, toId, remaining) => {
      const from = getSceneById(fromId);
      const hotspot = from?.hotspots?.find((h) => h.targetId === toId);
      const currentYaw = cameraYawRef?.current ?? 0;

      // Face the travel direction (hotspot yaw), taking the shortest turn from
      // wherever the camera currently points. No hotspot → keep current heading.
      let departureYaw = currentYaw;
      let panMs = 0;
      if (hotspot) {
        const delta = shortestDelta(hotspot.yaw, currentYaw);
        departureYaw = currentYaw + delta;
        panMs = Math.min(
          PAN_MS_MAX,
          Math.max(PAN_MS_MIN, (Math.abs(delta) / Math.PI) * 900)
        );
        setPanYaw(departureYaw);
      }

      schedule(() => {
        setPanYaw(null);
        setIncomingSceneId(toId);
        setTargetYaw(getArrivalYaw(fromId, toId, departureYaw));
        setIsTransitioning(true);

        schedule(() => {
          setCurrentSceneId(toId);
          setIncomingSceneId(null);
          setIsTransitioning(false);

          if (remaining.length > 0) {
            schedule(
              () => performHop(toId, remaining[0], remaining.slice(1)),
              HOP_DWELL_MS
            );
          } else {
            finishWalk();
          }
        }, TRANSITION_MS);
      }, panMs);
    },
    [cameraYawRef, schedule, finishWalk]
  );

  const navigateToScene = useCallback(
    (sceneId) => {
      if (walkingRef.current || sceneId === currentSceneId) return;
      if (!getSceneById(sceneId)) return;

      const path = findPath(currentSceneId, sceneId);
      const hops = path ? path.slice(1) : [sceneId]; // no path → single direct hop

      walkingRef.current = true;
      setIsWalking(true);
      performHop(currentSceneId, hops[0], hops.slice(1));
    },
    [currentSceneId, performHop]
  );

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
    isWalking,
    panYaw,
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
